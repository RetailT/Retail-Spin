const express = require('express');
const cors = require('cors');

require('dotenv').config();
console.log('FRONTEND_URL loaded as:', process.env.FRONTEND_URL); // TEMP DEBUG

const spinRoutes = require('./routes/spinRoutes');

const app = express();

// Allow both local dev and the deployed frontend. FRONTEND_URL can hold a
// single URL or a comma-separated list (e.g. "http://localhost:3000,https://retail-spin-frontend.vercel.app")
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (e.g. curl, Postman, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin} not in allowed list`));
    }
  },
  credentials: true
}));

app.use(express.json());

app.use('/api/spin', spinRoutes);

app.get('/', (req, res) => {
  res.send('Gift Spin System API is running');
});

// Local dev only — Vercel ignores this and uses the serverless export below instead
if (require.main === module) {
  const PORT = process.env.API_PORT || 5050;
  app.listen(PORT, () => {
    console.log(`🚀 Gift Spin backend running on http://localhost:${PORT}`);
  });
}

module.exports = app;