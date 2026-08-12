const { sql, getMasterPool } = require('../config/masterDb');
const { getShopPool } = require('../config/shopDb');

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress;
}

// Loopback addresses mean "this request never left the machine" — only
// meaningful for local dev where frontend and backend run on the same box.
function isLoopback(ip) {
  return ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1';
}

async function resolveShopMiddleware(req, res, next) {
  try {
    const clientIp = getClientIp(req);
    const masterPool = await getMasterPool();

    let result = await masterPool.request()
      .input('ip', sql.NVarChar(45), clientIp)
      .query(`
        SELECT TOP 1 COMPANY_NAME, SERVERIP, PORTNO, START_DATE, END_DATE
        FROM dbo.tb_SERVER_DETAILS
        WHERE BROWSING_IP = @ip
          AND CAST(GETDATE() AS DATE) BETWEEN START_DATE AND END_DATE
        ORDER BY IDX DESC
      `);

    // LOCAL DEV ONLY — triple-gated so this can NEVER activate in production,
    // even if TEST_FALLBACK_COMPANY is accidentally left set on Vercel:
    //   1. NODE_ENV must not be 'production' (Vercel always sets this to
    //      'production' for prod deployments — this alone blocks it there)
    //   2. the request must have arrived with NO x-forwarded-for header at
    //      all (a real proxy/edge network like Vercel always adds one, so
    //      this blocks header-spoofing attempts like "x-forwarded-for: 127.0.0.1")
    //   3. the raw socket address must actually be loopback
    const isGenuineLocalRequest =
      process.env.NODE_ENV !== 'production' &&
      !req.headers['x-forwarded-for'] &&
      isLoopback(req.socket.remoteAddress);

    if (result.recordset.length === 0 && isGenuineLocalRequest && process.env.TEST_FALLBACK_COMPANY) {
      console.warn(`⚠️ Local loopback request — using TEST_FALLBACK_COMPANY='${process.env.TEST_FALLBACK_COMPANY}' for dev testing`);
      result = await masterPool.request()
        .input('companyName', sql.NVarChar(100), process.env.TEST_FALLBACK_COMPANY)
        .query(`
          SELECT TOP 1 COMPANY_NAME, SERVERIP, PORTNO, START_DATE, END_DATE
          FROM dbo.tb_SERVER_DETAILS
          WHERE COMPANY_NAME = @companyName
            AND CAST(GETDATE() AS DATE) BETWEEN START_DATE AND END_DATE
          ORDER BY IDX DESC
        `);
    }

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