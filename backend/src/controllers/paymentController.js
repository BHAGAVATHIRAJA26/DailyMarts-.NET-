const Payment = require('../models/Payment');
const Bill = require('../models/Bill');
const Order = require('../models/Order');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// ─── Helper: unique payment ID ─────────────────────────────────────────────────
const generatePaymentId = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(100 + Math.random() * 900);
  return `PAY-${new Date().getFullYear()}-${ts}-${rand}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Customer records a UPI payment (status = PENDING)
//          NO auto-bill creation — customer must have a real bill.
//          Farmer must click "Mark Received" to confirm and reduce balance.
// @route   POST /api/payments
// @access  Private (Customer)
// ─────────────────────────────────────────────────────────────────────────────
const recordUpiPayment = async (req, res) => {
  try {
    const { billId, amount } = req.body;

    if (!amount || Number(amount) <= 0) {
      return errorResponse(res, 400, 'Valid payment amount is required');
    }

    const payAmount = Number(amount);
    let bill = null;

    // 1. Try resolving bill by Mongo _id, billId string, or invoiceNo
    if (billId && billId !== 'undefined' && billId !== 'null') {
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(billId);
      bill = await Bill.findOne({
        $or: [
          ...(isObjectId ? [{ _id: billId }] : []),
          { billId },
          { invoiceNo: billId },
        ],
        customer: req.user._id, // STRICT: must belong to this customer
      }).populate('farmer', 'name upiId farmName');
    }

    // 2. Fallback: Find the most recent pending bill for this customer (real data only)
    if (!bill) {
      bill = await Bill.findOne({
        customer: req.user._id,
        remainingAmount: { $gt: 0 },
      })
        .sort({ createdAt: -1 })
        .populate('farmer', 'name upiId farmName');
    }

    // 3. If no bill exists — return error, do NOT create fake data
    if (!bill) {
      return errorResponse(
        res,
        404,
        'No pending bill found. Please ask your farmer to generate a bill first.'
      );
    }

    if (payAmount > bill.remainingAmount) {
      return errorResponse(
        res,
        400,
        `Payment amount ₹${payAmount} exceeds remaining bill amount ₹${bill.remainingAmount}`
      );
    }

    const farmerId = bill.farmer ? bill.farmer._id : null;
    if (!farmerId) {
      return errorResponse(res, 400, 'Bill has no associated farmer');
    }

    // Create payment record with status PENDING (balance NOT reduced yet)
    const paymentId = generatePaymentId();
    const payment = await Payment.create({
      paymentId,
      transactionId: `UPI-PENDING-${Date.now()}`,
      customer: req.user._id,
      farmer: farmerId,
      bill: bill._id,
      amount: payAmount,
      paymentMethod: 'UPI',
      status: 'PENDING',
    });

    // Notify farmer to confirm the payment
    await Notification.create({
      recipient: farmerId,
      sender: req.user._id,
      type: 'PAYMENT_RECEIVED',
      title: '💰 UPI Payment Pending Confirmation',
      message: `${req.user.name} recorded ₹${payAmount} payment via UPI for Invoice #${bill.invoiceNo}. Please confirm receipt.`,
      icon: '💰',
      relatedEntityId: payment.paymentId,
    });

    return successResponse(res, 201, 'Payment recorded. Awaiting farmer confirmation.', {
      payment,
      farmerUpiId: bill.farmer?.upiId || null,
      billSummary: {
        invoiceNo: bill.invoiceNo,
        totalAmount: bill.totalAmount,
        paidAmount: bill.paidAmount,
        remainingAmount: bill.remainingAmount,
        paymentStatus: bill.paymentStatus,
      },
    });
  } catch (error) {
    console.error('recordUpiPayment Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Farmer confirms UPI receipt → balance is reduced NOW
// @route   PATCH /api/payments/:paymentId/confirm
// @access  Private (Farmer only)
// ─────────────────────────────────────────────────────────────────────────────
const confirmPaymentReceived = async (req, res) => {
  try {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.paymentId);
    const payment = await Payment.findOne({
      $or: [
        ...(isObjectId ? [{ _id: req.params.paymentId }] : []),
        { paymentId: req.params.paymentId },
      ],
    })
      .populate('bill')
      .populate('customer', 'name email');

    if (!payment) {
      return errorResponse(res, 404, 'Payment record not found');
    }

    // Only the associated farmer can confirm
    if (payment.farmer.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Not authorized to confirm this payment');
    }

    if (payment.status === 'SUCCESS') {
      return errorResponse(res, 400, 'Payment already confirmed');
    }

    const bill = payment.bill;
    const payAmount = payment.amount;

    if (bill) {
      bill.paidAmount = (bill.paidAmount || 0) + payAmount;
      bill.remainingAmount = Math.max(0, bill.totalAmount - bill.paidAmount);
      bill.paymentStatus = bill.remainingAmount === 0 ? 'PAID' : 'PARTIALLY_PAID';
      await bill.save();

      // Also update related orders' payment status
      await Order.updateMany(
        { customer: payment.customer._id, farmer: req.user._id },
        { paymentStatus: bill.paymentStatus }
      );
    }

    // Credit farmer's wallet balance
    const farmer = await User.findById(req.user._id);
    if (farmer) {
      farmer.walletBalance = (farmer.walletBalance || 0) + payAmount;
      await farmer.save();
    }

    payment.status = 'SUCCESS';
    payment.transactionId = `UPI-CONFIRMED-${Date.now()}`;
    await payment.save();

    // Notify Customer
    if (payment.customer) {
      await Notification.create({
        recipient: payment.customer._id,
        sender: req.user._id,
        type: 'PAYMENT_RECEIVED',
        title: '✅ Payment Confirmed by Farmer',
        message: `Farmer ${req.user.name} confirmed receipt of ₹${payAmount}. Your bill balance has been updated.`,
        icon: '✅',
        relatedEntityId: payment.paymentId,
      });
    }

    return successResponse(res, 200, 'Payment confirmed. Bill balance updated.', {
      payment,
      farmerWalletBalance: farmer ? farmer.walletBalance : 0,
      billSummary: bill
        ? {
            invoiceNo: bill.invoiceNo,
            totalAmount: bill.totalAmount,
            paidAmount: bill.paidAmount,
            remainingAmount: bill.remainingAmount,
            paymentStatus: bill.paymentStatus,
          }
        : null,
    });
  } catch (error) {
    console.error('confirmPaymentReceived Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get pending payments for the logged-in farmer to confirm
// @route   GET /api/payments/pending
// @access  Private (Farmer)
// ─────────────────────────────────────────────────────────────────────────────
const getPendingPayments = async (req, res) => {
  try {
    const payments = await Payment.find({
      farmer: req.user._id,
      status: 'PENDING',
    })
      .populate('customer', 'name phone email')
      .populate('bill', 'invoiceNo totalAmount paidAmount remainingAmount billingPeriod')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, `Found ${payments.length} pending payments`, payments);
  } catch (error) {
    console.error('getPendingPayments Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get farmer's UPI ID (for customer payment QR — fetched from DB only)
// @route   GET /api/payments/farmer-upi/:farmerId
// @access  Private (Customer)
// ─────────────────────────────────────────────────────────────────────────────
const getFarmerUpi = async (req, res) => {
  try {
    let farmer = null;

    if (
      req.params.farmerId &&
      req.params.farmerId !== 'null' &&
      req.params.farmerId !== 'undefined'
    ) {
      farmer = await User.findOne({
        _id: req.params.farmerId,
        role: 'FARMER',
      }).select('name farmName upiId');
    }

    if (!farmer) {
      return errorResponse(res, 404, 'Farmer not found');
    }

    if (!farmer.upiId) {
      return errorResponse(res, 404, 'This farmer has not set up a UPI ID yet');
    }

    return successResponse(res, 200, 'Farmer UPI fetched', {
      farmerName: farmer.farmName || farmer.name,
      upiId: farmer.upiId,
    });
  } catch (error) {
    console.error('getFarmerUpi Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get payment history — strictly scoped to logged-in user
// @route   GET /api/payments/history
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getPaymentHistory = async (req, res) => {
  try {
    const query =
      req.user.role === 'FARMER'
        ? { farmer: req.user._id }
        : { customer: req.user._id };

    const payments = await Payment.find(query)
      .populate('customer', 'name phone')
      .populate('farmer', 'name farmName')
      .populate('bill', 'invoiceNo totalAmount paidAmount remainingAmount billingPeriod')
      .sort({ createdAt: -1 });

    // New users with no payments get [] — no mock data
    return successResponse(res, 200, `Found ${payments.length} payments`, payments);
  } catch (error) {
    console.error('getPaymentHistory Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

module.exports = {
  recordUpiPayment,
  confirmPaymentReceived,
  getPendingPayments,
  getFarmerUpi,
  getPaymentHistory,
};
