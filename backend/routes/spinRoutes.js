const express = require('express');
const router = express.Router();
const { getActiveItems, playSpin, getSpinHistory } = require('../controllers/spinController');

router.get('/items', getActiveItems);
router.post('/play', playSpin);
router.get('/history', getSpinHistory);

module.exports = router;
