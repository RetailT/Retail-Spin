const sql = require('mssql');
require('dotenv').config();

// One pool PER SHOP SERVER, cached by "ip:port" so repeated requests from
// the same shop reuse the same connection instead of reconnecting every time.
const shopPoolCache = new Map();

function getShopPool(serverIp, portNo) {
  const key = `${serverIp}:${portNo}`;

  if (shopPoolCache.has(key)) {
    return shopPoolCache.get(key);
  }

  const shopDbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: serverIp,
    port: parseInt(portNo, 10),
    database: process.env.DB_NAME,
    options: {
      encrypt: false,
      trustServerCertificate: true
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    },
    connectionTimeout: 6000 // reduced from 8000 — Vercel's default function
    // timeout is 10s, so this needs enough margin to fail gracefully and
    // return a proper 503 error response instead of the whole function
    // getting killed mid-connection-attempt
  };

  const poolPromise = new sql.ConnectionPool(shopDbConfig)
    .connect()
    .then((pool) => {
      console.log(`✅ Connected to shop server ${key} (POSBACK_SYSTEM)`);
      return pool;
    })
    .catch((err) => {
      shopPoolCache.delete(key); // don't cache a failed connection — allow retry
      console.error(`❌ Shop DB connection failed (${key}):`, err.message);
      throw err;
    });

  shopPoolCache.set(key, poolPromise);
  return poolPromise;
}

module.exports = { sql, getShopPool };