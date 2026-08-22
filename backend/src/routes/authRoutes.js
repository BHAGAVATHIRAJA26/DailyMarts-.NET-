const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);

// Profile update routes — both PUT /api/auth/me and PUT /api/auth/profile work
router.put('/me', protect, updateProfile);
router.put('/profile', protect, updateProfile);

module.exports = router;
