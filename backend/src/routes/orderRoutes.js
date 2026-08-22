const express = require('express');
const router = express.Router();
const { createOrder, getOrders, getOrderById, updateOrderStatus } = require('../controllers/orderController');
const { updateDeliveryStatus } = require('../controllers/deliveryController');
const { createCancellation } = require('../controllers/cancellationController');
const { protect, farmerOnly } = require('../middleware/authMiddleware');

router.post('/', protect, createOrder);
router.get('/', protect, getOrders);
router.get('/:id', protect, getOrderById);
router.patch('/:id/status', protect, farmerOnly, updateOrderStatus);
router.patch('/:id/supplied', protect, updateDeliveryStatus);
router.patch('/:id/cancel', protect, createCancellation);

module.exports = router;
