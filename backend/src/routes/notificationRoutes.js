const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markRead,
  sendPaymentReminder,
  sendCustomEmailToCustomer,
} = require('../controllers/notificationController');
const { protect, farmerOnly } = require('../middleware/authMiddleware');

router.get('/', protect, getNotifications);
router.patch('/read-all', protect, markRead);
router.patch('/:id/read', protect, markRead);

// Farmer sending email to customer routes
router.post('/remind/:customerId', protect, farmerOnly, sendPaymentReminder);
router.post('/send-email', protect, farmerOnly, sendCustomEmailToCustomer);

module.exports = router;
