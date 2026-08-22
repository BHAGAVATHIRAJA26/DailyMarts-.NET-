const express = require('express');
const router = express.Router();
const { createSubscription, getSubscriptions, pauseSubscription, cancelSubscription } = require('../controllers/subscriptionController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createSubscription);
router.get('/', protect, getSubscriptions);
router.patch('/:id/pause', protect, pauseSubscription);
router.patch('/:id/cancel', protect, cancelSubscription);

module.exports = router;
