const Delivery = require('../models/Delivery');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// @desc    Get daily delivery records
// @route   GET /api/deliveries
// @access  Private
const getDeliveries = async (req, res) => {
  try {
    const { date, status } = req.query;
    const filter = req.user.role === 'FARMER' ? { farmer: req.user._id } : { customer: req.user._id };

    if (date) filter.date = date;
    if (status) filter.status = status.toUpperCase();

    const deliveries = await Delivery.find(filter)
      .populate('product', 'name emoji category')
      .populate('customer', 'name phone address city')
      .populate('farmer', 'name farmName phone')
      .sort({ date: -1 });

    return successResponse(res, 200, `Found ${deliveries.length} delivery records`, deliveries);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

// @desc    Mark daily delivery status (Farmer only)
// @route   PATCH /api/deliveries/:id/status
// @route   PATCH /api/orders/:id/supplied
// @access  Private (Farmer)
const updateDeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, deliveredQuantity } = req.body;

    let delivery = await Delivery.findById(id);

    if (!delivery) {
      // Check if ID is order ID
      const Order = require('../models/Order');
      const order = await Order.findById(id);
      if (order) {
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
      delivery.deliveredQuantity = Number(deliveredQuantity);
      delivery.totalCost = delivery.deliveredQuantity * delivery.pricePerUnit;
    }

    await delivery.save();

    return successResponse(res, 200, 'Delivery status updated successfully', delivery);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

module.exports = { getDeliveries, updateDeliveryStatus };
