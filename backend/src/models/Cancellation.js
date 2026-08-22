const mongoose = require('mongoose');

const cancellationSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      default: null,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    cancellationType: {
      type: String,
      enum: ['SINGLE_DAY', 'DATE_RANGE', 'FULL_SUBSCRIPTION'],
      required: true,
    },
    skipDate: { type: String, default: null }, // YYYY-MM-DD for SINGLE_DAY
    startDate: { type: String, default: null },
    endDate: { type: String, default: null },
    reason: {
      type: String,
      required: [true, 'Cancellation reason is required'],
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'APPROVED',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Cancellation', cancellationSchema);
