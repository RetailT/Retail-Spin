const { sql } = require('../config/shopDb'); // just need `sql` types here, pool comes from req

// ⚠️ TESTING VALUE — bumped from 0.10 to 0.50 so wins are easy to trigger while you're
// checking the winner UI/celebration flow. REVERT TO 0.10 before going live.
const WIN_CHANCE = 0.50;

// GET /api/spin/items  -> active items, used by frontend to draw the wheel
async function getActiveItems(req, res) {
  try {
    const pool = req.shopPool; // resolved by resolveShopMiddleware based on caller's IP
    const result = await pool.request().query(`
      SELECT IDX, ITEM_NAME, ITEM_DESCRIPTION, ITEM_WEIGHT, STOCK_QTY
      FROM dbo.tb_SPIN_ITEMS
      WHERE IS_ACTIVE = 1 AND STOCK_QTY > 0
      ORDER BY IDX ASC
    `);
    res.status(200).json({ success: true, items: result.recordset });
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
async function playSpin(req, res) {
  const { customerName, invoiceNo, phoneNo } = req.body;

  if (!customerName || !invoiceNo || !phoneNo) {
    return res.status(400).json({
      success: false,
      message: 'customerName, invoiceNo and phoneNo are all required'
    });
  }

  const pool = req.shopPool; // resolved by resolveShopMiddleware based on caller's IP
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
        message: 'Invoice eka mekata kalinma spin karala thiyenawa'
      });
    }

    let isWinner = false;
    let wonItemId = 0;
    let wonItemName = 'TRY AGAIN';

    if (Math.random() < WIN_CHANCE) {
      const itemsResult = await new sql.Request(transaction).query(`
        SELECT IDX, ITEM_NAME, ITEM_WEIGHT, STOCK_QTY
        FROM dbo.tb_SPIN_ITEMS WITH (UPDLOCK, ROWLOCK)
        WHERE IS_ACTIVE = 1 AND STOCK_QTY > 0
      `);

      if (itemsResult.recordset.length > 0) {
        const chosen = pickWeightedItem(itemsResult.recordset);
        isWinner = true;
        wonItemId = chosen.IDX;
        wonItemName = chosen.ITEM_NAME;

        await new sql.Request(transaction)
          .input('itemId', sql.Int, wonItemId)
          .query(`UPDATE dbo.tb_SPIN_ITEMS SET STOCK_QTY = STOCK_QTY - 1 WHERE IDX = @itemId`);
      }
    }

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

// GET /api/spin/history  (optional - for admin/reporting view)
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