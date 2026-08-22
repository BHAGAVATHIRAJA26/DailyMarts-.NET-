const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    paymentId: { type: String, unique: true, required: true },
    transactionId: { type: String, default: null },
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
    bill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bill',
      required: true,
    },
    amount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['UPI', 'CREDIT_CARD', 'DEBIT_CARD', 'NET_BANKING', 'CASH'],
      default: 'UPI',
    },
    paymentDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'],
      default: 'SUCCESS',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
