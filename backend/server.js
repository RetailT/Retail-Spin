const express = require('express');
const cors = require('cors');
require('dotenv').config();

const spinRoutes = require('./routes/spinRoutes');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || '*', // set to your Vercel frontend URL in production
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