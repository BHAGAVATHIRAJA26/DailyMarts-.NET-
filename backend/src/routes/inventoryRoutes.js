const express = require('express');
const router = express.Router();
const { getDailyInventory, updateDailyCapacity } = require('../controllers/inventoryController');
const { protect, farmerOnly } = require('../middleware/authMiddleware');

router.get('/', protect, getDailyInventory);
router.post('/update', protect, farmerOnly, updateDailyCapacity);

module.exports = router;
