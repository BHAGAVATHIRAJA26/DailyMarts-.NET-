const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    subscriptionId: { type: String, unique: true, required: true },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: { type: Number, required: true, default: 1 },
    unit: { type: String, required: true, default: 'L' },
    frequency: {
      type: String,
      enum: ['DAILY', 'WEEKLY', 'MONTHLY'],
      default: 'DAILY',
    },
    deliverySlot: {
      type: String,
      enum: ['MORNING', 'EVENING', 'BOTH'],
      default: 'MORNING',
    },
    startDate: { type: String, required: true }, // YYYY-MM-DD
    endDate: { type: String, default: null },
    durationDays: { type: Number, default: 30 },
    pricePerUnit: { type: Number, required: true },
    estimatedMonthlyAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED'],
      default: 'ACTIVE',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
