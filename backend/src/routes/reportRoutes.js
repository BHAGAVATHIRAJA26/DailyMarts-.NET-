const express = require('express');
const router = express.Router();
const { getFarmerStats } = require('../controllers/farmerReportController');
const { protect, farmerOnly } = require('../middleware/authMiddleware');

router.get('/farmer/stats', protect, farmerOnly, getFarmerStats);

module.exports = router;
