const mongoose = require('mongoose');

const billSchema = new mongoose.Schema(
  {
    billId: { type: String, unique: true, required: true },
    invoiceNo: { type: String, unique: true, required: true },
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
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      default: null,
    },
    billingPeriod: { type: String, required: true }, // e.g. "August 2026"
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    productName: { type: String, required: true },
    totalDeliveredQuantity: { type: Number, required: true },
    unit: { type: String, required: true, default: 'L' },
    pricePerUnit: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    remainingAmount: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ['PAID', 'PARTIALLY_PAID', 'PENDING', 'OVERDUE'],
      default: 'PENDING',
    },
    dueDate: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Bill', billSchema);
