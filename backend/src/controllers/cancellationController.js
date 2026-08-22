const Cancellation = require('../models/Cancellation');
const Subscription = require('../models/Subscription');
const Order = require('../models/Order');
const Delivery = require('../models/Delivery');
const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// @desc    Cancel order/subscription (One day skip, date range, or full subscription)
// @route   POST /api/cancellations
// @route   PATCH /api/orders/:id/cancel
// @access  Private (Customer)
const createCancellation = async (req, res) => {
  try {
    const { subscriptionId, orderId, cancellationType, skipDate, startDate, endDate, reason } = req.body;

    if (!reason || !reason.trim()) {
      return errorResponse(res, 400, 'Cancellation reason is required');
    }

    const type = cancellationType ? cancellationType.toUpperCase() : 'SINGLE_DAY';

    let sub = null;
    let ord = null;

    if (subscriptionId) {
      sub = await Subscription.findById(subscriptionId);
    } else if (orderId || req.params.id) {
      const targetId = orderId || req.params.id;
      ord = await Order.findOne({
        $or: [{ _id: targetId.match(/^[0-9a-fA-F]{24}$/) ? targetId : null }, { orderId: targetId }],
      });
    }

    const cancellation = await Cancellation.create({
      customer: req.user._id,
      subscription: sub ? sub._id : null,
      order: ord ? ord._id : null,
      cancellationType: type,
      skipDate: skipDate || new Date().toISOString().slice(0, 10),
      startDate,
      endDate,
      reason,
      status: 'APPROVED',
    });

    // Update target entity status
    if (ord) {
      ord.orderStatus = 'CANCELLED';
      await ord.save();
    } else if (sub) {
      if (type === 'FULL_SUBSCRIPTION') {
        sub.status = 'CANCELLED';
        await sub.save();
      }
      // Update delivery record for today if single day skip
      const targetSkipDate = skipDate || new Date().toISOString().slice(0, 10);
      await Delivery.updateMany(
        { subscription: sub._id, date: targetSkipDate },
        { status: 'SKIPPED', deliveredQuantity: 0, totalCost: 0 }
      );
    }

    // Notify Farmer
    const recipientId = ord ? ord.farmer : sub ? sub.farmer : null;
    if (recipientId) {
      await Notification.create({
        recipient: recipientId,
        sender: req.user._id,
        type: 'ORDER_CANCELLED',
        title: '❌ Product Delivery Cancelled',
        message: `${req.user.name} cancelled/skipped delivery. Reason: ${reason}`,
        icon: '❌',
      });
    }

    return successResponse(res, 201, 'Cancellation processed successfully', cancellation);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

module.exports = { createCancellation };
