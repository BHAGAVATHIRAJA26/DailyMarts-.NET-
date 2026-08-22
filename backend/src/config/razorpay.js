const Razorpay = require('razorpay');

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_Rav7PqqDQLc4Wd',
  key_secret: process.env.RAZORPAY_SECRET || 'eJ9At1SCU94OqHwPQQQ6cLCa',
});

module.exports = razorpayInstance;
