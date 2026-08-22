const express = require('express');
const router = express.Router();
const { createCancellation } = require('../controllers/cancellationController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createCancellation);

module.exports = router;
