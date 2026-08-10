const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,           // set true if using Azure / SSL
    trustServerCertificate: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Single cached pool promise shared across the whole app.
// IMPORTANT: never call pool.close() inside controllers — that caused
// the ECONNCLOSED race in RTPOS. The pool is closed once, on process exit.
let poolPromise = null;

function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(dbConfig)
      .connect()
      .then((pool) => {
        console.log('✅ Connected to POSBACK_SYSTEM (MSSQL)');
        return pool;
      })
      .catch((err) => {
        poolPromise = null; // allow retry on next request
        console.error('❌ DB connection failed:', err.message);
        throw err;
      });
  }
  return poolPromise;
}

process.on('SIGINT', async () => {
  if (poolPromise) {
    const pool = await poolPromise;
    await pool.close();
  }
  process.exit(0);
});

module.exports = { sql, getPool };
