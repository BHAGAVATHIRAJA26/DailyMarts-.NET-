const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema(
  {
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
    date: { type: String, required: true }, // YYYY-MM-DD
    deliverySlot: {
      type: String,
      enum: ['MORNING', 'EVENING', 'BOTH'],
      default: 'MORNING',
    },
    requestedQuantity: { type: Number, required: true },
    deliveredQuantity: { type: Number, required: true, default: 0 },
    unit: { type: String, required: true, default: 'L' },
    pricePerUnit: { type: Number, required: true },
    totalCost: { type: Number, required: true }, // deliveredQuantity * pricePerUnit
    status: {
      type: String,
      enum: ['PENDING', 'DELIVERED', 'SKIPPED', 'CANCELLED', 'FAILED'],
      default: 'PENDING',
    },
  },
  { timestamps: true }
);

deliverySchema.index({ customer: 1, product: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Delivery', deliverySchema);
