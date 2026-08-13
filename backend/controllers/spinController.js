const { sql } = require('../config/shopDb');

// GET /api/spin/items -> the CURRENT active 5-item set (based on cycle state),
// used by the frontend to show which prizes are live right now.
// Also returns companyName (resolved by resolveShopMiddleware from
// tb_SERVER_DETAILS based on caller's IP) so the frontend can show which
// shop is running the spin without a separate API call.
async function getActiveItems(req, res) {
  try {
    const pool = req.shopPool;

    const stateResult = await pool.request().query(`
      SELECT TOP 1 ITEM_SET FROM dbo.tb_SPIN_CYCLE_STATE ORDER BY IDX DESC
    `);
    const itemSet = stateResult.recordset[0]?.ITEM_SET ?? 0;

    // Rank all active items by IDX; rank 1-5 = item set 0, rank 6-10 = item set 1.
    const result = await pool.request()
      .input('itemSet', sql.Int, itemSet)
      .query(`
        WITH ranked AS (
          SELECT IDX, ITEM_NAME, ITEM_DESCRIPTION, ITEM_WEIGHT, STOCK_QTY,
                 ROW_NUMBER() OVER (ORDER BY IDX ASC) AS rn
          FROM dbo.tb_SPIN_ITEMS
          WHERE IS_ACTIVE = 1
        )
        SELECT IDX, ITEM_NAME, ITEM_DESCRIPTION, ITEM_WEIGHT, STOCK_QTY
        FROM ranked
        WHERE (@itemSet = 0 AND rn BETWEEN 1 AND 5)
           OR (@itemSet = 1 AND rn BETWEEN 6 AND 10)
        ORDER BY IDX ASC
      `);

    res.status(200).json({
      success: true,
      items: result.recordset,
      itemSet,
      companyName: req.companyName || null
    });
  } catch (err) {
    console.error('getActiveItems error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch spin items' });
  }
}

// Weighted random pick from an array of items using ITEM_WEIGHT
function pickWeightedItem(items) {
  const totalWeight = items.reduce((sum, it) => sum + it.ITEM_WEIGHT, 0);
  let rand = Math.random() * totalWeight;
  for (const item of items) {
    rand -= item.ITEM_WEIGHT;
    if (rand <= 0) return item;
  }
  return items[items.length - 1]; // fallback safety
}

// POST /api/spin/play
// body: { customerName, invoiceNo, phoneNo }
//
// WIN GUARANTEE LOGIC: exactly 5 wins out of every 10 spins (not a flat 50%
// chance each time). We do this the same way you'd deal a shuffled deck
// without replacement — the win probability for THIS spin is
// (winsStillNeeded / spinsStillRemainingInBatch). E.g. spin #1 of the batch
// has a 5/10 chance; if it wins, spin #2 has 4/9; if it loses, spin #2 has
// 5/9 — and so on. By spin #10 the last outcome is forced (either the last
// guaranteed win or the last guaranteed loss), so the batch always lands on
// exactly 5 wins / 5 losses, in a genuinely random order each time.
//
// ITEM SET ROTATION: which 5 items are "live" alternates every 10 spins —
// batch 1 uses items ranked 1-5 (by IDX), batch 2 uses items ranked 6-10,
// batch 3 goes back to 1-5, and so on forever.
async function playSpin(req, res) {
  const { customerName, invoiceNo, phoneNo } = req.body;

  if (!customerName || !invoiceNo || !phoneNo) {
    return res.status(400).json({
      success: false,
      message: 'customerName, invoiceNo and phoneNo are all required'
    });
  }

  const pool = req.shopPool;
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    const request = new sql.Request(transaction);

    // Prevent duplicate spin for the same invoice
    const existing = await request
      .input('invoiceNoCheck', sql.NVarChar(50), invoiceNo)
      .query(`SELECT IDX FROM dbo.tb_SPIN_CUSTOMERS WHERE INVOICE_NO = @invoiceNoCheck`);

    if (existing.recordset.length > 0) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: 'This invoice has already been used for a spin.'
      });
    }

    // Lock the single cycle-state row so concurrent spins can't race each other
    // into miscounting the batch (two cashiers spinning at the same instant).
    const stateResult = await new sql.Request(transaction).query(`
      SELECT TOP 1 IDX, POSITION_IN_BATCH, WINS_IN_BATCH, ITEM_SET
      FROM dbo.tb_SPIN_CYCLE_STATE WITH (UPDLOCK, ROWLOCK)
      ORDER BY IDX DESC
    `);
    const state = stateResult.recordset[0];

    const remainingSlots = 10 - state.POSITION_IN_BATCH;
    const remainingWinsNeeded = 5 - state.WINS_IN_BATCH;

    // Guaranteed-ratio draw: probability shrinks/grows to force exactly 5
    // wins by the time remainingSlots hits 0.
    const winProbability = remainingSlots > 0 ? remainingWinsNeeded / remainingSlots : 0;
    let isWinner = Math.random() < winProbability;

    let wonItemId = 0;
    let wonItemName = 'TRY AGAIN';

    if (isWinner) {
      // Only pick from the 5 items belonging to the CURRENT item set.
      const itemsResult = await new sql.Request(transaction)
        .input('itemSet', sql.Int, state.ITEM_SET)
        .query(`
          WITH ranked AS (
            SELECT IDX, ITEM_NAME, ITEM_WEIGHT, STOCK_QTY,
                   ROW_NUMBER() OVER (ORDER BY IDX ASC) AS rn
            FROM dbo.tb_SPIN_ITEMS WITH (UPDLOCK, ROWLOCK)
            WHERE IS_ACTIVE = 1
          )
          SELECT IDX, ITEM_NAME, ITEM_WEIGHT, STOCK_QTY
          FROM ranked
          WHERE ((@itemSet = 0 AND rn BETWEEN 1 AND 5)
              OR (@itemSet = 1 AND rn BETWEEN 6 AND 10))
            AND STOCK_QTY > 0
        `);

      if (itemsResult.recordset.length > 0) {
        const chosen = pickWeightedItem(itemsResult.recordset);
        wonItemId = chosen.IDX;
        wonItemName = chosen.ITEM_NAME;

        await new sql.Request(transaction)
          .input('itemId', sql.Int, wonItemId)
          .query(`UPDATE dbo.tb_SPIN_ITEMS SET STOCK_QTY = STOCK_QTY - 1 WHERE IDX = @itemId`);
      } else {
        // Current item set is out of stock entirely — falls through as a loss
        // even though the batch "owed" a win here. Rare edge case; keep stock
        // topped up to avoid it.
        isWinner = false;
      }
    }

    // Advance the cycle: bump position/wins, and if we just completed spin
    // #10 of the batch, reset to 0 and flip which 5 items are live next.
    let newPosition = state.POSITION_IN_BATCH + 1;
    let newWins = state.WINS_IN_BATCH + (isWinner ? 1 : 0);
    let newItemSet = state.ITEM_SET;

    if (newPosition >= 10) {
      newPosition = 0;
      newWins = 0;
      newItemSet = state.ITEM_SET === 0 ? 1 : 0;
    }

    await new sql.Request(transaction)
      .input('stateIdx', sql.Int, state.IDX)
      .input('newPosition', sql.Int, newPosition)
      .input('newWins', sql.Int, newWins)
      .input('newItemSet', sql.Int, newItemSet)
      .query(`
        UPDATE dbo.tb_SPIN_CYCLE_STATE
        SET POSITION_IN_BATCH = @newPosition,
            WINS_IN_BATCH = @newWins,
            ITEM_SET = @newItemSet,
            UPDATED_TIME = GETDATE()
        WHERE IDX = @stateIdx
      `);

    const insertResult = await new sql.Request(transaction)
      .input('customerName', sql.NVarChar(100), customerName)
      .input('invoiceNo', sql.NVarChar(50), invoiceNo)
      .input('phoneNo', sql.NVarChar(20), phoneNo)
      .input('wonItemId', sql.Int, wonItemId)
      .input('wonItemName', sql.NVarChar(100), wonItemName)
      .input('isWinner', sql.Bit, isWinner)
      .query(`
        INSERT INTO dbo.tb_SPIN_CUSTOMERS
          (CUSTOMER_NAME, INVOICE_NO, PHONE_NO, WON_ITEM_ID, WON_ITEM_NAME, IS_WINNER)
        OUTPUT INSERTED.IDX, INSERTED.INSERT_TIME, INSERTED.EXPIRED_TIME
        VALUES (@customerName, @invoiceNo, @phoneNo, @wonItemId, @wonItemName, @isWinner)
      `);

    await transaction.commit();

    const inserted = insertResult.recordset[0];

    res.status(200).json({
      success: true,
      isWinner,
      wonItemId,
      wonItemName,
      spinRecordId: inserted.IDX,
      insertTime: inserted.INSERT_TIME,
      expiredTime: inserted.EXPIRED_TIME
    });
  } catch (err) {
    console.error('playSpin error:', err);
    try { await transaction.rollback(); } catch (_) {}
    res.status(500).json({ success: false, message: 'Spin failed, try again' });
  }
}

// GET /api/spin/history (optional - for admin/reporting view)
async function getSpinHistory(req, res) {
  try {
    const pool = req.shopPool;
    const result = await pool.request().query(`
      SELECT TOP 200 IDX, CUSTOMER_NAME, INVOICE_NO, PHONE_NO,
             WON_ITEM_NAME, IS_WINNER, IS_REDEEMED, INSERT_TIME, EXPIRED_TIME
      FROM dbo.tb_SPIN_CUSTOMERS
      ORDER BY IDX DESC
    `);
    res.status(200).json({ success: true, records: result.recordset });
  } catch (err) {
    console.error('getSpinHistory error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch history' });
  }
}

module.exports = { getActiveItems, playSpin, getSpinHistory };