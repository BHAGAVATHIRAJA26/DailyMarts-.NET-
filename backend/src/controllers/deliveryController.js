const Delivery = require('../models/Delivery');
const Order = require('../models/Order');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// ─── GET /api/deliveries ──────────────────────────────────────────────────────
// @desc    Get daily delivery records — strictly scoped by user role & ID
// @access  Private
const getDeliveries = async (req, res) => {
  try {
    const { date, status } = req.query;
    const filter =
      req.user.role === 'FARMER'
        ? { farmer: req.user._id }
        : { customer: req.user._id };

    if (date) filter.date = date;
    if (status) filter.status = status.toUpperCase();

    const deliveries = await Delivery.find(filter)
      .populate('product', 'name emoji category price unit')
      .populate('customer', 'name phone address city')
      .populate('farmer', 'name farmName phone city')
      .sort({ date: -1 });

    return successResponse(res, 200, `Found ${deliveries.length} delivery records`, deliveries);
  } catch (error) {
    console.error('getDeliveries Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

// ─── PATCH /api/deliveries/:id/status OR /api/orders/:id/supplied ───────────
// @desc    Mark daily delivery status (Farmer only)
// @access  Private (Farmer)
const updateDeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, deliveredQuantity } = req.body;

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);

    let delivery = await Delivery.findOne({
      $or: [
        ...(isObjectId ? [{ _id: id }] : []),
        { date: id },
      ],
    });

    if (!delivery) {
      // Check if ID is Order ID
      const order = await Order.findOne({
        $or: [
          ...(isObjectId ? [{ _id: id }] : []),
          { orderId: id },
        ],
      });

      if (order) {
        if (order.farmer.toString() !== req.user._id.toString()) {
          return errorResponse(res, 403, 'Not authorized to update this order');
        }
        order.orderStatus = 'SUPPLIED';
        await order.save();
        return successResponse(res, 200, 'Order marked as supplied', order);
      }

      return errorResponse(res, 404, 'Delivery record not found');
    }

    if (delivery.farmer.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Not authorized to update this delivery record');
    }

    if (status) delivery.status = status.toUpperCase();

    if (deliveredQuantity !== undefined) {
      const qty = Number(deliveredQuantity);
      if (isNaN(qty) || qty < 0) {
        return errorResponse(res, 400, 'Delivered quantity must be a non-negative number');
      }
      delivery.deliveredQuantity = qty;
      delivery.totalCost = qty * delivery.pricePerUnit;
    }

    await delivery.save();
    return successResponse(res, 200, 'Delivery status updated successfully', delivery);
  } catch (error) {
    console.error('updateDeliveryStatus Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

module.exports = { getDeliveries, updateDeliveryStatus };
