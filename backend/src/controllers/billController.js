const Bill = require('../models/Bill');
const Delivery = require('../models/Delivery');
const Subscription = require('../models/Subscription');
const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// @desc    Get monthly bills
// @route   GET /api/bills
// @access  Private
const getBills = async (req, res) => {
  try {
    const filter = req.user.role === 'FARMER' ? { farmer: req.user._id } : { customer: req.user._id };

    if (req.query.status) {
      filter.paymentStatus = req.query.status.toUpperCase();
    }

    const bills = await Bill.find(filter)
      .populate('customer', 'name phone address city')
      .populate('farmer', 'name farmName phone')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, `Found ${bills.length} bills`, bills);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

// @desc    Generate a monthly bill on demand
// @route   POST /api/bills/generate
// @access  Private (Farmer)
const generateBill = async (req, res) => {
  try {
    const { subscriptionId, customerId, period } = req.body;
    const now = new Date();
    const billingPeriod = period || now.toLocaleString('default', { month: 'long', year: 'numeric' });

    const subscription = await Subscription.findById(subscriptionId).populate('product');

    if (!subscription) {
      return errorResponse(res, 404, 'Subscription not found');
    }

    // Business Rule 2 & 4: Calculate from actual DELIVERED quantities only
    const deliveries = await Delivery.find({
      subscription: subscription._id,
      status: 'DELIVERED',
    });

    const totalDeliveredQuantity = deliveries.reduce((sum, d) => sum + d.deliveredQuantity, 0);
    const subtotal = totalDeliveredQuantity * subscription.pricePerUnit;

    const uniqueId = Date.now().toString().slice(-6) + Math.floor(100 + Math.random() * 900);
    const invoiceNo = `INV-DM-${now.getFullYear()}-${uniqueId}`;
    const billId = `BILL-${now.getFullYear()}-${uniqueId}`;

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
    return errorResponse(res, 500, error.message);
  }
};

module.exports = { getBills, generateBill };
