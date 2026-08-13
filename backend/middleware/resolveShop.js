const { sql, getMasterPool } = require('../config/masterDb');
const { getShopPool } = require('../config/shopDb');

async function resolveShopMiddleware(req, res, next) {
  const companyName = req.query.company || req.headers['x-company-name'];

  if (!companyName) {
    return res.status(400).json({
      success: false,
      message: 'Missing company identifier. Add ?company=YOUR_COMPANY_NAME to the URL.'
    });
  }

  try {
    const masterPool = await getMasterPool();

    const result = await masterPool.request()
      .input('companyName', sql.NVarChar(100), companyName)
      .query(`
        SELECT TOP 1 COMPANY_NAME, SERVERIP, PORTNO, START_DATE, END_DATE
        FROM dbo.tb_SERVER_DETAILS
        WHERE COMPANY_NAME = @companyName
          AND CAST(GETDATE() AS DATE) BETWEEN START_DATE AND END_DATE
        ORDER BY IDX DESC
      `);

    if (result.recordset.length === 0) {
      return res.status(403).json({
        success: false,
        message: `Company '${companyName}' not recognized or subscription expired. Contact admin.`
      });
    }

    const shop = result.recordset[0];
    req.companyName = shop.COMPANY_NAME;

    // Try connecting to the shop's own server SEPARATELY from the lookup
    // above, so a connection failure (server offline, wrong port, firewall)
    // gets its own specific error message instead of being confused with
    // "company not found".
    try {
      req.shopPool = await getShopPool(shop.SERVERIP, shop.PORTNO);
    } catch (connErr) {
      console.error(`Shop DB connection failed for ${companyName} (${shop.SERVERIP}:${shop.PORTNO}):`, connErr.message);
      return res.status(503).json({
        success: false,
        message: `Could not connect to ${companyName}'s server (${shop.SERVERIP}:${shop.PORTNO}). The server may be offline or unreachable from here.`
      });
    }

    next();
  } catch (err) {
    console.error('resolveShopMiddleware error:', err);
    res.status(500).json({
      success: false,
      message: 'Could not verify company. Please try again.'
    });
  }
}

module.exports = resolveShopMiddleware;