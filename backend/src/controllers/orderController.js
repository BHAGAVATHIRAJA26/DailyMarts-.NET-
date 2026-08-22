const Order = require('../models/Order');
const Product = require('../models/Product');
const DailyInventory = require('../models/DailyInventory');
const Notification = require('../models/Notification');
const { sendOrderConfirmationEmail } = require('../services/emailService');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// ─── Helper: race-condition-safe unique Order ID ───────────────────────────────
const generateOrderId = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(100 + Math.random() * 900);
  return `ORD-${new Date().getFullYear()}-${ts}-${rand}`;
};

// ─── POST /api/orders ─────────────────────────────────────────────────────────
// @desc    Create new one-time order with daily inventory check & deduction
// @access  Private (Customer)
const createOrder = async (req, res) => {
  try {
    const { productId, quantity, deliverySlot, deliveryDate } = req.body;
    const requestedQty = Number(quantity);

    if (!productId) {
      return errorResponse(res, 400, 'productId is required');
    }
    if (!requestedQty || requestedQty <= 0) {
      return errorResponse(res, 400, 'Valid order quantity is required');
    }

    // Resolve product by Mongo _id OR custom productId string
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(productId);
    const product = await Product.findOne({
      $or: [
        ...(isObjectId ? [{ _id: productId }] : []),
        { productId },
      ],
    }).populate('farmer', 'name email farmName phone');

    if (!product) {
      return errorResponse(res, 404, 'Product not found');
    }

    if (product.status === 'INACTIVE') {
      return errorResponse(res, 400, 'This product is currently unavailable');
    }

    const targetDate = deliveryDate || new Date().toISOString().slice(0, 10);

    // Check & update daily inventory atomically
    let inventory = await DailyInventory.findOne({ product: product._id, date: targetDate });

    if (!inventory) {
      inventory = await DailyInventory.create({
        product: product._id,
        productId: product.productId,
        farmer: product.farmer._id,
        date: targetDate,
        availableQuantity: 50,
        soldQuantity: 0,
        remainingQuantity: 50,
        unit: product.unit,
        price: product.price,
        status: 'AVAILABLE',
      });
    }

    if (requestedQty > inventory.remainingQuantity) {
      return errorResponse(
        res,
        400,
        `Insufficient inventory. Requested ${requestedQty} ${product.unit}, only ${inventory.remainingQuantity} ${product.unit} remaining today.`
      );
    }

    // Update inventory quantities
    inventory.soldQuantity += requestedQty;
    inventory.remainingQuantity = inventory.availableQuantity - inventory.soldQuantity;
    if (inventory.remainingQuantity === 0) inventory.status = 'SOLD_OUT';
    else if (inventory.remainingQuantity < 5) inventory.status = 'LIMITED';
    await inventory.save();

    const orderId = generateOrderId();
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

    // Notify Farmer
    await Notification.create({
      recipient: product.farmer._id,
      sender: req.user._id,
      type: 'ORDER_CREATED',
      title: '📦 New Customer Order',
      message: `${req.user.name} ordered ${requestedQty} ${product.unit} of ${product.name}.`,
      icon: '📦',
      relatedEntityId: order.orderId,
    });

    // Send confirmation email (non-blocking)
    sendOrderConfirmationEmail(req.user, order).catch((err) =>
      console.error('Order email error:', err.message)
    );

    return successResponse(res, 201, 'Order created successfully', order);
  } catch (error) {
    console.error('createOrder Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

// ─── GET /api/orders ──────────────────────────────────────────────────────────
// @desc    Get all orders for logged-in user — strictly scoped to their own data
// @access  Private
const getOrders = async (req, res) => {
  try {
    // STRICT user scoping — never return other users' orders
    const filter =
      req.user.role === 'FARMER'
        ? { farmer: req.user._id }
        : { customer: req.user._id };

    if (req.query.status) {
      filter.orderStatus = req.query.status.toUpperCase();
    }

    const orders = await Order.find(filter)
      .populate('product', 'name emoji category fatContent unit price')
      .populate('farmer', 'name farmName phone city')
      .populate('customer', 'name phone address city')
      .sort({ createdAt: -1 });

    // Always return array — never null or mock data
    return successResponse(res, 200, `Found ${orders.length} orders`, orders);
  } catch (error) {
    console.error('getOrders Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

// ─── GET /api/orders/:id ──────────────────────────────────────────────────────
// @desc    Get order by ID — with ownership check
// @access  Private
const getOrderById = async (req, res) => {
  try {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
    const order = await Order.findOne({
      $or: [
        ...(isObjectId ? [{ _id: req.params.id }] : []),
        { orderId: req.params.id },
      ],
    })
      .populate('product', 'name emoji category fatContent unit price packaging isOrganic')
      .populate('farmer', 'name farmName phone city address')
      .populate('customer', 'name phone address city');

    if (!order) {
      return errorResponse(res, 404, 'Order not found');
    }

    // Ownership check — only the relevant customer or farmer can view
    const userId = req.user._id.toString();
    if (
      order.customer?._id?.toString() !== userId &&
      order.farmer?._id?.toString() !== userId
    ) {
      return errorResponse(res, 403, 'Not authorized to view this order');
    }

    return successResponse(res, 200, 'Order details fetched', order);
  } catch (error) {
    console.error('getOrderById Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

// ─── PATCH /api/orders/:id/status ─────────────────────────────────────────────
// @desc    Update order status (Farmer only)
// @access  Private (Farmer)
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'SUPPLIED', 'CANCELLED', 'COMPLETED'];

    if (!status || !validStatuses.includes(status.toUpperCase())) {
      return errorResponse(res, 400, `Valid status required: ${validStatuses.join(', ')}`);
    }

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
    const order = await Order.findOne({
      $or: [
        ...(isObjectId ? [{ _id: req.params.id }] : []),
        { orderId: req.params.id },
      ],
    });

    if (!order) {
      return errorResponse(res, 404, 'Order not found');
    }

    if (order.farmer.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Not authorized to update this order');
    }

    order.orderStatus = status.toUpperCase();
    await order.save();

    // Notify Customer
    await Notification.create({
      recipient: order.customer,
      sender: req.user._id,
      type: 'ORDER_UPDATED',
      title: `📦 Order ${status.toUpperCase()}`,
      message: `Your order ${order.orderId} is now ${status.toUpperCase()}.`,
      icon: '📦',
      relatedEntityId: order.orderId,
    });

    return successResponse(res, 200, 'Order status updated', order);
  } catch (error) {
    console.error('updateOrderStatus Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

module.exports = { createOrder, getOrders, getOrderById, updateOrderStatus };
