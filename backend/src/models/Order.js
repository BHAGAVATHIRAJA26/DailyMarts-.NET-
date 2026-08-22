const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true, required: true },
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
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    pricePerUnit: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    orderDate: { type: String, required: true }, // YYYY-MM-DD
    deliveryDate: { type: String, required: true },
    deliverySlot: {
      type: String,
      enum: ['MORNING', 'EVENING', 'BOTH'],
      default: 'MORNING',
    },
    orderStatus: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'SUPPLIED', 'CANCELLED', 'COMPLETED'],
      default: 'CONFIRMED',
    },
    paymentStatus: {
      type: String,
      enum: ['PAID', 'PARTIALLY_PAID', 'PENDING', 'OVERDUE'],
      default: 'PENDING',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
