const express = require('express');
const router = express.Router();
const {
  recordUpiPayment,
  confirmPaymentReceived,
  getPendingPayments,
  getFarmerUpi,
  getPaymentHistory,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// Customer: record a UPI payment (creates PENDING entry, no balance change yet)
router.post('/', protect, recordUpiPayment);

// Customer: get farmer's UPI ID from DB (for QR generation)
router.get('/farmer-upi/:farmerId', protect, getFarmerUpi);

// Farmer: get all payments pending their confirmation
router.get('/pending', protect, getPendingPayments);

// Farmer: confirm they received the payment → updates bill balance & wallet
router.patch('/:paymentId/confirm', protect, confirmPaymentReceived);

// Both: get payment history
router.get('/history', protect, getPaymentHistory);

module.exports = router;
