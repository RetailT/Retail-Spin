const express = require('express');
const router = express.Router();
const resolveShopMiddleware = require('../middleware/resolveShop');
const { getActiveItems, playSpin, getSpinHistory } = require('../controllers/spinController');

// Every spin route first resolves WHICH shop this request belongs to
// (based on caller's IP) and attaches req.shopPool before hitting the controller.
router.get('/items', resolveShopMiddleware, getActiveItems);
router.post('/play', resolveShopMiddleware, playSpin);
router.get('/history', resolveShopMiddleware, getSpinHistory);

module.exports = router;