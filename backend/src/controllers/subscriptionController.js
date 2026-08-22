const Subscription = require('../models/Subscription');
const Product = require('../models/Product');
const Delivery = require('../models/Delivery');
const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// ─── Helper: race-condition-safe unique Subscription ID ───────────────────────
const generateSubscriptionId = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(100 + Math.random() * 900);
  return `SUB-DM-${new Date().getFullYear()}-${ts}-${rand}`;
};

// ─── POST /api/subscriptions ──────────────────────────────────────────────────
// @desc    Create recurring milk subscription (Customer only)
// @access  Private (Customer)
const createSubscription = async (req, res) => {
  try {
    const { productId, farmerId, quantity, frequency, deliverySlot, startDate, durationDays } = req.body;

    if (!productId) {
      return errorResponse(res, 400, 'productId is required');
    }

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(productId);
    const product = await Product.findOne({
      $or: [
        ...(isObjectId ? [{ _id: productId }] : []),
        { productId },
      ],
    }).populate('farmer');

    if (!product) {
      return errorResponse(res, 404, 'Product not found');
    }

    if (product.status === 'INACTIVE') {
      return errorResponse(res, 400, 'This product is currently unavailable');
    }

    const subscriptionId = generateSubscriptionId();
    const qty = Math.max(1, Number(quantity) || 1);
    const days = Math.max(1, Number(durationDays) || 30);
    const freq = frequency ? frequency.toUpperCase() : 'DAILY';
    const slot = deliverySlot ? deliverySlot.toUpperCase() : 'MORNING';

    const multiplier =
      freq === 'DAILY' ? days :
      freq === 'WEEKLY' ? Math.ceil(days / 7) :
      freq === 'ALTERNATE' ? Math.ceil(days / 2) : 1;

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

    // Generate first delivery record for today (safely handles duplicate key index)
    const today = new Date().toISOString().slice(0, 10);
    try {
      await Delivery.findOneAndUpdate(
        { customer: req.user._id, product: product._id, date: today },
        {
          $setOnInsert: {
            subscription: subscription._id,
            farmer: product.farmer._id,
            deliverySlot: slot,
            requestedQuantity: qty,
            deliveredQuantity: qty,
            unit: product.unit,
            pricePerUnit: product.price,
            totalCost: qty * product.price,
            status: 'PENDING',
          },
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.warn('Initial delivery upsert skipped:', err.message);
    }

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
    console.error('createSubscription Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

// ─── GET /api/subscriptions ───────────────────────────────────────────────────
// @desc    Get subscriptions for logged-in user — strictly scoped to their own
// @access  Private
const getSubscriptions = async (req, res) => {
  try {
    // STRICT user scoping — never leak other users' subscriptions
    const filter =
      req.user.role === 'FARMER'
        ? { farmer: req.user._id }
        : { customer: req.user._id };

    if (req.query.status) {
      filter.status = req.query.status.toUpperCase();
    }

    const subscriptions = await Subscription.find(filter)
      .populate('product', 'name emoji category fatContent price unit packaging isOrganic')
      .populate('farmer', 'name farmName phone city')
      .populate('customer', 'name phone address city')
      .sort({ createdAt: -1 });

    // Always return array — new users with no subscriptions get []
    return successResponse(res, 200, `Found ${subscriptions.length} subscriptions`, subscriptions);
  } catch (error) {
    console.error('getSubscriptions Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

// ─── PATCH /api/subscriptions/:id/pause ───────────────────────────────────────
// @desc    Pause a subscription (Customer or Farmer)
// @access  Private
const pauseSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      $or: [{ _id: req.params.id }, { subscriptionId: req.params.id }],
    });

    if (!subscription) {
      return errorResponse(res, 404, 'Subscription not found');
    }

    const userId = req.user._id.toString();
    if (
      subscription.customer.toString() !== userId &&
      subscription.farmer.toString() !== userId
    ) {
      return errorResponse(res, 403, 'Not authorized');
    }

    subscription.status = 'PAUSED';
    await subscription.save();

    return successResponse(res, 200, 'Subscription paused', subscription);
  } catch (error) {
    console.error('pauseSubscription Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

// ─── PATCH /api/subscriptions/:id/cancel ─────────────────────────────────────
// @desc    Cancel a subscription (Customer or Farmer)
// @access  Private
const cancelSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      $or: [{ _id: req.params.id }, { subscriptionId: req.params.id }],
    });

    if (!subscription) {
      return errorResponse(res, 404, 'Subscription not found');
    }

    const userId = req.user._id.toString();
    if (
      subscription.customer.toString() !== userId &&
      subscription.farmer.toString() !== userId
    ) {
      return errorResponse(res, 403, 'Not authorized');
    }

    subscription.status = 'CANCELLED';
    await subscription.save();

    return successResponse(res, 200, 'Subscription cancelled', subscription);
  } catch (error) {
    console.error('cancelSubscription Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

module.exports = { createSubscription, getSubscriptions, pauseSubscription, cancelSubscription };
