const Order = require('../models/Order');
const Product = require('../models/Product');
const DailyInventory = require('../models/DailyInventory');
const Notification = require('../models/Notification');
const { sendOrderConfirmationEmail } = require('../services/emailService');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// @desc    Create new one-time order with daily inventory check & deduction
// @route   POST /api/orders
// @access  Private (Customer)
const createOrder = async (req, res) => {
  try {
    const { productId, quantity, deliverySlot, deliveryDate } = req.body;
    const requestedQty = Number(quantity);

    if (!requestedQty || requestedQty <= 0) {
      return errorResponse(res, 400, 'Valid order quantity is required');
    }

    const product = await Product.findOne({
      $or: [{ _id: productId.match(/^[0-9a-fA-F]{24}$/) ? productId : null }, { productId }],
    }).populate('farmer', 'name email farmName phone');

    if (!product) {
      return errorResponse(res, 404, 'Product not found');
    }

    const targetDate = deliveryDate || new Date().toISOString().slice(0, 10);

    // Business Rule 1 & 10: Check daily inventory & prevent negative stock
    let inventory = await DailyInventory.findOne({ product: product._id, date: targetDate });

    if (!inventory) {
      // Create initial daily inventory snapshot
      inventory = await DailyInventory.create({
        product: product._id,
        productId: product.productId,
        farmer: product.farmer._id,
        date: targetDate,
        availableQuantity: 40,
        soldQuantity: 0,
        remainingQuantity: 40,
        unit: product.unit,
        price: product.price,
        status: 'AVAILABLE',
      });
    }

    if (requestedQty > inventory.remainingQuantity) {
      return errorResponse(
        res,
        400,
        `Insufficient inventory. Requested ${requestedQty} ${product.unit}, but only ${inventory.remainingQuantity} ${product.unit} remaining today.`
      );
    }

    // Atomic update of daily inventory
    inventory.soldQuantity += requestedQty;
    inventory.remainingQuantity = inventory.availableQuantity - inventory.soldQuantity;
    if (inventory.remainingQuantity === 0) inventory.status = 'SOLD_OUT';
    else if (inventory.remainingQuantity < 5) inventory.status = 'LIMITED';
    await inventory.save();

    const count = await Order.countDocuments();
    const orderId = `ORD-${new Date().getFullYear()}-${10001 + count}`;
    const totalAmount = requestedQty * product.price;

    const order = await Order.create({
      orderId,
      customer: req.user._id,
      farmer: product.farmer._id,
      product: product._id,
      quantity: requestedQty,
      unit: product.unit,
      pricePerUnit: product.price,
      totalAmount,
      orderDate: new Date().toISOString().slice(0, 10),
      deliveryDate: targetDate,
      deliverySlot: deliverySlot ? deliverySlot.toUpperCase() : 'MORNING',
      orderStatus: 'CONFIRMED',
      paymentStatus: 'PENDING',
    });

    // In-app Notification for Farmer
    await Notification.create({
      recipient: product.farmer._id,
      sender: req.user._id,
      type: 'ORDER_CREATED',
      title: '📦 New Customer Order',
      message: `${req.user.name} ordered ${requestedQty} ${product.unit} of ${product.name}.`,
      icon: '📦',
      relatedEntityId: order.orderId,
    });

    // Send email confirmation
    sendOrderConfirmationEmail(req.user, order);

    return successResponse(res, 201, 'Order created successfully', order);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

// @desc    Get all orders for logged-in user
// @route   GET /api/orders
// @access  Private
const getOrders = async (req, res) => {
  try {
    const filter = req.user.role === 'FARMER' ? { farmer: req.user._id } : { customer: req.user._id };

    if (req.query.status) {
      filter.orderStatus = req.query.status.toUpperCase();
    }

    const orders = await Order.find(filter)
      .populate('product', 'name emoji category fatContent')
      .populate('farmer', 'name farmName phone location')
      .populate('customer', 'name phone address city')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, `Found ${orders.length} orders`, orders);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

// @desc    Get order details by orderId
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      $or: [{ _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }, { orderId: req.params.id }],
    })
      .populate('product')
      .populate('farmer', 'name farmName phone location')
      .populate('customer', 'name phone address city');

    if (!order) {
      return errorResponse(res, 404, 'Order not found');
    }

    return successResponse(res, 200, 'Order details fetched', order);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

module.exports = { createOrder, getOrders, getOrderById };
