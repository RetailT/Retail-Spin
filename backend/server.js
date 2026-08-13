const express = require('express');
const cors = require('cors');
require('dotenv').config();

const spinRoutes = require('./routes/spinRoutes');

const app = express();

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: function (origin, callback) {
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

if (require.main === module) {
  const PORT = process.env.API_PORT || 5050;
  app.listen(PORT, () => {
    console.log(`🚀 Gift Spin backend running on http://localhost:${PORT}`);
  });
}

module.exports = app;