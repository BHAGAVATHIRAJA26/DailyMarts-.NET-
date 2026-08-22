const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: [
        'ORDER_CREATED',
        'ORDER_ACCEPTED',
        'ORDER_UPDATED',
        'ORDER_CANCELLED',
        'PAYMENT_PENDING',
        'PAYMENT_RECEIVED',
        'BILL_GENERATED',
        'PAYMENT_REMINDER',
        'EXCHANGE_REQUEST',
        'EXCHANGE_ACCEPTED',
        'EXCHANGE_REJECTED',
        'DELIVERY_DISPATCHED',
        'ANNOUNCEMENT',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    icon: { type: String, default: '🔔' },
    isRead: { type: Boolean, default: false },
    relatedEntityId: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
