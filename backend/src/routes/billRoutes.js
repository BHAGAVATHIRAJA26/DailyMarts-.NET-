const express = require('express');
const router = express.Router();
const { getBills, generateBill } = require('../controllers/billController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getBills);
router.post('/generate', protect, generateBill);

module.exports = router;
