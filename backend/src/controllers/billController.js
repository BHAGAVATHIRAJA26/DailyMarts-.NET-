const Bill = require('../models/Bill');
const Delivery = require('../models/Delivery');
const Subscription = require('../models/Subscription');
const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// ─── Helper: unique Bill/Invoice IDs — no race condition ──────────────────────
const generateBillIds = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(100 + Math.random() * 900);
  const year = new Date().getFullYear();
  return {
    billId: `BILL-${year}-${ts}-${rand}`,
    invoiceNo: `INV-DM-${year}-${ts}-${rand}`,
  };
};

// ─── GET /api/bills ───────────────────────────────────────────────────────────
// @desc    Get bills — strictly scoped to logged-in user
// @access  Private
const getBills = async (req, res) => {
  try {
    // STRICT user scoping — new users with no bills get []
    const filter =
      req.user.role === 'FARMER'
        ? { farmer: req.user._id }
        : { customer: req.user._id };

    if (req.query.status) {
      filter.paymentStatus = req.query.status.toUpperCase();
    }

    const bills = await Bill.find(filter)
      .populate('customer', 'name phone address city')
      .populate('farmer', 'name farmName phone upiId')
      .sort({ createdAt: -1 });

    // Returns [] for new users — never mock/cross-user data
    return successResponse(res, 200, `Found ${bills.length} bills`, bills);
  } catch (error) {
    console.error('getBills Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

// ─── GET /api/bills/:id ───────────────────────────────────────────────────────
// @desc    Get single bill by ID with ownership check
// @access  Private
const getBillById = async (req, res) => {
  try {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
    const bill = await Bill.findOne({
      $or: [
        ...(isObjectId ? [{ _id: req.params.id }] : []),
        { billId: req.params.id },
        { invoiceNo: req.params.id },
      ],
    })
      .populate('customer', 'name phone address city')
      .populate('farmer', 'name farmName phone upiId');

    if (!bill) {
      return errorResponse(res, 404, 'Bill not found');
    }

    const userId = req.user._id.toString();
    if (
      bill.customer?._id?.toString() !== userId &&
      bill.farmer?._id?.toString() !== userId
    ) {
      return errorResponse(res, 403, 'Not authorized to view this bill');
    }

    return successResponse(res, 200, 'Bill fetched', bill);
  } catch (error) {
    console.error('getBillById Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

// ─── POST /api/bills/generate ─────────────────────────────────────────────────
// @desc    Generate a monthly bill on demand (Farmer only)
// @access  Private (Farmer)
const generateBill = async (req, res) => {
  try {
    const { subscriptionId, customerId, period } = req.body;

    if (!subscriptionId) {
      return errorResponse(res, 400, 'subscriptionId is required');
    }

    const now = new Date();
    const billingPeriod = period || now.toLocaleString('default', { month: 'long', year: 'numeric' });

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(subscriptionId);
    const subscription = await Subscription.findOne({
      $or: [
        ...(isObjectId ? [{ _id: subscriptionId }] : []),
        { subscriptionId },
      ],
    }).populate('product');

    if (!subscription) {
      return errorResponse(res, 404, 'Subscription not found');
    }

    // Verify the farmer owns this subscription
    if (subscription.farmer.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Not authorized to generate bill for this subscription');
    }

    // Calculate total from DELIVERED quantities only — no guessing
    const deliveries = await Delivery.find({
      subscription: subscription._id,
      status: 'DELIVERED',
    });

    const totalDeliveredQuantity = deliveries.reduce((sum, d) => sum + (d.deliveredQuantity || 0), 0);
    const subtotal = totalDeliveredQuantity * subscription.pricePerUnit;

    const { billId, invoiceNo } = generateBillIds();

    const bill = await Bill.create({
      billId,
      invoiceNo,
      customer: customerId || subscription.customer,
      farmer: req.user._id,
      subscription: subscription._id,
      billingPeriod,
      startDate: subscription.startDate,
      endDate: now.toISOString().slice(0, 10),
      productName: subscription.product.name,
      totalDeliveredQuantity,
      unit: subscription.unit,
      pricePerUnit: subscription.pricePerUnit,
      subtotal,
      totalAmount: subtotal,
      paidAmount: 0,
      remainingAmount: subtotal,
      paymentStatus: 'PENDING',
      dueDate: new Date(now.getFullYear(), now.getMonth(), 28).toISOString().slice(0, 10),
    });

    // Notify Customer
    await Notification.create({
      recipient: subscription.customer,
      sender: req.user._id,
      type: 'BILL_GENERATED',
      title: '📄 New Monthly Bill Generated',
      message: `Your bill for ${subscription.product.name} (${billingPeriod}) is ₹${subtotal}. Due by 28th.`,
      icon: '📄',
      relatedEntityId: bill.invoiceNo,
    });

    return successResponse(res, 201, 'Monthly bill generated successfully', bill);
  } catch (error) {
    console.error('generateBill Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

module.exports = { getBills, getBillById, generateBill };
