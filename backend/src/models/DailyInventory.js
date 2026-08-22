const mongoose = require('mongoose');

const dailyInventorySchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productId: { type: String, required: true },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: String, // YYYY-MM-DD format
      required: true,
    },
    availableQuantity: {
      type: Number,
      required: true,
      min: [0, 'Available quantity cannot be negative'],
    },
    soldQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Sold quantity cannot be negative'],
    },
    remainingQuantity: {
      type: Number,
      required: true,
      min: [0, 'Remaining quantity cannot be negative'],
    },
    unit: { type: String, required: true, default: 'L' },
    price: { type: Number, required: true },
    status: {
      type: String,
      enum: ['AVAILABLE', 'LIMITED', 'SOLD_OUT'],
      default: 'AVAILABLE',
    },
  },
  { timestamps: true }
);

// Ensure a single inventory document per product per farmer per day
dailyInventorySchema.index({ product: 1, farmer: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyInventory', dailyInventorySchema);
