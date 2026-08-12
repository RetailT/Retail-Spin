const { sql, getMasterPool } = require('../config/masterDb');
const { getShopPool } = require('../config/shopDb');

function getClientIp(req) {
  // Behind Vercel/any proxy, the real client IP is in x-forwarded-for
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress;
}

async function resolveShopMiddleware(req, res, next) {
  try {
    const clientIp = getClientIp(req);
    const masterPool = await getMasterPool();

    const result = await masterPool.request()
      .input('ip', sql.NVarChar(45), clientIp)
      .query(`
        SELECT TOP 1 COMPANY_NAME, SERVERIP, PORTNO, START_DATE, END_DATE
        FROM dbo.tb_SERVER_DETAILS
        WHERE SERVERIP = @ip
          AND CAST(GETDATE() AS DATE) BETWEEN START_DATE AND END_DATE
        ORDER BY IDX DESC
      `);

    if (result.recordset.length === 0) {
      return res.status(403).json({
        success: false,
        message: `Shop not recognized or subscription expired (IP: ${clientIp}). Contact admin.`
      });
    }

    const shop = result.recordset[0];
    req.companyName = shop.COMPANY_NAME;
    req.shopPool = await getShopPool(shop.SERVERIP, shop.PORTNO);

    next();
  } catch (err) {
    console.error('resolveShopMiddleware error:', err);
    res.status(500).json({
      success: false,
      message: 'Could not verify shop / connect to shop database'
    });
  }
}

module.exports = resolveShopMiddleware;