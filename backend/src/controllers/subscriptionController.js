const Subscription = require('../models/Subscription');
const Product = require('../models/Product');
const Delivery = require('../models/Delivery');
const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// @desc    Create recurring milk subscription
// @route   POST /api/subscriptions
// @access  Private (Customer)
const createSubscription = async (req, res) => {
  try {
    const { productId, farmerId, quantity, frequency, deliverySlot, startDate, durationDays } = req.body;

    const product = await Product.findOne({
      $or: [{ _id: productId.match(/^[0-9a-fA-F]{24}$/) ? productId : null }, { productId }],
    }).populate('farmer');

    if (!product) {
      return errorResponse(res, 404, 'Product not found');
    }

    const count = await Subscription.countDocuments();
    const subscriptionId = `SUB-DM-${new Date().getFullYear()}-${10001 + count}`;
    const qty = Number(quantity) || 1;
    const days = Number(durationDays) || 30;
    const freq = frequency ? frequency.toUpperCase() : 'DAILY';
    const slot = deliverySlot ? deliverySlot.toUpperCase() : 'MORNING';

    const multiplier = freq === 'DAILY' ? days : freq === 'WEEKLY' ? Math.ceil(days / 7) : 1;
    const estimatedMonthlyAmount = product.price * qty * multiplier;

    const subscription = await Subscription.create({
      subscriptionId,
      customer: req.user._id,
      farmer: farmerId || product.farmer._id,
      product: product._id,
      quantity: qty,
      unit: product.unit,
      frequency: freq,
      deliverySlot: slot,
      startDate: startDate || new Date().toISOString().slice(0, 10),
      durationDays: days,
      pricePerUnit: product.price,
      estimatedMonthlyAmount,
      status: 'ACTIVE',
    });

    // Generate immediate first daily delivery record
    const today = new Date().toISOString().slice(0, 10);
    await Delivery.create({
      subscription: subscription._id,
      customer: req.user._id,
      farmer: product.farmer._id,
      product: product._id,
      date: today,
      deliverySlot: slot,
      requestedQuantity: qty,
      deliveredQuantity: qty,
      unit: product.unit,
      pricePerUnit: product.price,
      totalCost: qty * product.price,
      status: 'PENDING',
    });

    // Notify Farmer
    await Notification.create({
      recipient: product.farmer._id,
      sender: req.user._id,
      type: 'ORDER_CREATED',
      title: '🥛 New Milk Subscription',
      message: `${req.user.name} subscribed to ${qty} ${product.unit} ${product.name} (${freq}, ${slot}).`,
      icon: '🥛',
      relatedEntityId: subscription.subscriptionId,
    });

    return successResponse(res, 201, 'Recurring subscription created successfully', subscription);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

// @desc    Get subscriptions for logged in user
// @route   GET /api/subscriptions
// @access  Private
const getSubscriptions = async (req, res) => {
  try {
    const filter = req.user.role === 'FARMER' ? { farmer: req.user._id } : { customer: req.user._id };

    const subscriptions = await Subscription.find(filter)
      .populate('product', 'name emoji category fatContent price unit')
      .populate('farmer', 'name farmName phone location')
      .populate('customer', 'name phone address city')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, `Found ${subscriptions.length} subscriptions`, subscriptions);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

module.exports = { createSubscription, getSubscriptions };
