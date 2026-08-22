const express = require('express');
const router = express.Router();
const {
  getNearbyFarmers,
  getExchangeRequests,
  createExchangeRequest,
  acceptExchangeRequest,
} = require('../controllers/exchangeController');
const { protect, farmerOnly } = require('../middleware/authMiddleware');

router.get('/nearby', getNearbyFarmers);
router.get('/requests', protect, farmerOnly, getExchangeRequests);
router.post('/requests', protect, farmerOnly, createExchangeRequest);
router.patch('/requests/:id/accept', protect, farmerOnly, acceptExchangeRequest);

module.exports = router;
