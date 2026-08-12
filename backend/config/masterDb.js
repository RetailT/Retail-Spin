const sql = require('mssql');
require('dotenv').config();

// This ALWAYS connects to RT's own fixed server — the one holding
// RTPOS_MAIN.dbo.tb_SERVER_DETAILS, the lookup table that tells us
// which shop's own server to connect to for their actual spin data.
const masterDbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,           // 173.208.167.190
  port: parseInt(process.env.DB_PORT, 10), // 47182
  database: process.env.DB_MASTER_NAME,    // RTPOS_MAIN
  options: {
    encrypt: false,
    trustServerCertificate: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  connectionTimeout: 8000
};

let masterPoolPromise = null;

function getMasterPool() {
  if (!masterPoolPromise) {
    masterPoolPromise = new sql.ConnectionPool(masterDbConfig)
      .connect()
      .then((pool) => {
        console.log('✅ Connected to RTPOS_MAIN (master lookup)');
        return pool;
      })
      .catch((err) => {
        masterPoolPromise = null; // allow retry on next request
        console.error('❌ Master DB connection failed:', err.message);
        throw err;
      });
  }
  return masterPoolPromise;
}

module.exports = { sql, getMasterPool };