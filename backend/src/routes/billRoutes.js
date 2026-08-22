const express = require('express');
const router = express.Router();
const { getBills, getBillById, generateBill } = require('../controllers/billController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getBills);
router.get('/:id', protect, getBillById);
router.post('/generate', protect, generateBill);

module.exports = router;
