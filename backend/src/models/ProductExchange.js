const mongoose = require('mongoose');

const productExchangeSchema = new mongoose.Schema(
  {
    exchangeId: { type: String, unique: true, required: true },
    senderFarmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverFarmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    exchangeType: {
      type: String,
      enum: ['SWAP', 'PAID'],
      default: 'SWAP',
    },
    requestedProduct: { type: String, required: true },
    requiredQuantity: { type: Number, required: true },
    unit: { type: String, required: true, default: 'L' },
    offeredProduct: { type: String, default: null }, // for SWAP mode
    pricePerUnit: { type: Number, default: null }, // for PAID mode
    offeredAmount: { type: Number, default: null },
    location: { type: String, required: true },
    notes: { type: String, default: null },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ProductExchange', productExchangeSchema);
