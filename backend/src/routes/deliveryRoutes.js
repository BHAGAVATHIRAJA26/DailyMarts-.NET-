const express = require('express');
const router = express.Router();
const { getDeliveries, updateDeliveryStatus } = require('../controllers/deliveryController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getDeliveries);
router.patch('/:id/status', protect, updateDeliveryStatus);

module.exports = router;
