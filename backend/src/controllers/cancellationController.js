const Cancellation = require('../models/Cancellation');
const Subscription = require('../models/Subscription');
const Order = require('../models/Order');
const Delivery = require('../models/Delivery');
const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// ─── POST /api/cancellations OR PATCH /api/orders/:id/cancel ─────────────────
// @desc    Cancel order/subscription (One day skip, date range, or full subscription)
// @access  Private (Customer or Farmer)
const createCancellation = async (req, res) => {
  try {
    const { subscriptionId, orderId, cancellationType, skipDate, startDate, endDate, reason } = req.body;
    const targetId = orderId || subscriptionId || req.params.id;

    const cancelReason = reason ? reason.trim() : 'Customer request';
    const type = cancellationType ? cancellationType.toUpperCase() : 'SINGLE_DAY';

    let sub = null;
    let ord = null;

    if (targetId) {
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(targetId);

      // 1. Try finding Order
      ord = await Order.findOne({
        $or: [
          ...(isObjectId ? [{ _id: targetId }] : []),
          { orderId: targetId },
        ],
      });

      // 2. If no order, try finding Subscription
      if (!ord) {
        sub = await Subscription.findOne({
          $or: [
            ...(isObjectId ? [{ _id: targetId }] : []),
            { subscriptionId: targetId },
          ],
        });
      }
    }

    if (!ord && !sub) {
      return errorResponse(res, 404, 'Order or Subscription not found');
    }

    // Ownership check — caller must be the customer or farmer of this order/sub
    const userId = req.user._id.toString();
    const customerId = ord ? ord.customer.toString() : sub.customer.toString();
    const farmerId = ord ? ord.farmer.toString() : sub.farmer.toString();

    if (userId !== customerId && userId !== farmerId) {
      return errorResponse(res, 403, 'Not authorized to cancel this item');
    }

    const cancellation = await Cancellation.create({
      customer: customerId,
      subscription: sub ? sub._id : null,
      order: ord ? ord._id : null,
      cancellationType: type,
      skipDate: skipDate || new Date().toISOString().slice(0, 10),
      startDate,
      endDate,
      reason: cancelReason,
      status: 'APPROVED',
    });

    // Update target entity status
    if (ord) {
      ord.orderStatus = 'CANCELLED';
      await ord.save();
    } else if (sub) {
      if (type === 'FULL_SUBSCRIPTION' || type === 'CANCEL') {
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

    // Notify recipient
    const recipientId = userId === customerId ? farmerId : customerId;
    await Notification.create({
      recipient: recipientId,
      sender: req.user._id,
      type: 'ORDER_CANCELLED',
      title: '❌ Delivery / Order Cancelled',
      message: `${req.user.name} cancelled/skipped delivery. Reason: ${cancelReason}`,
      icon: '❌',
    });

    return successResponse(res, 201, 'Cancellation processed successfully', cancellation);
  } catch (error) {
    console.error('createCancellation Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

module.exports = { createCancellation };
