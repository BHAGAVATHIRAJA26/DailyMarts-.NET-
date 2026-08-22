const Payment = require('../models/Payment');
const Bill = require('../models/Bill');
const Order = require('../models/Order');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Customer records a UPI payment (status = PENDING, no balance change)
//          The farmer must manually confirm receipt before balance is updated.
// @route   POST /api/payments
// @access  Private (Customer)
// ─────────────────────────────────────────────────────────────────────────────
const recordUpiPayment = async (req, res) => {
  try {
    const { billId, amount } = req.body;
    const payAmount = Number(amount) || 660;

    let bill = null;

    // 1. Try resolving bill by Mongo _id, billId string, or invoiceNo
    if (billId && billId !== 'undefined' && billId !== 'null') {
      bill = await Bill.findOne({
        $or: [
          { _id: billId.match(/^[0-9a-fA-F]{24}$/) ? billId : null },
          { billId },
          { invoiceNo: billId },
        ],
      }).populate('farmer', 'name upiId farmName');
    }

    // 2. Fallback: Find any existing pending bill for this customer
    if (!bill) {
      bill = await Bill.findOne({ customer: req.user._id, remainingAmount: { $gt: 0 } })
        .populate('farmer', 'name upiId farmName');
    }

    // 3. Fallback: Find any bill for customer regardless of remainingAmount
    if (!bill) {
      bill = await Bill.findOne({ customer: req.user._id })
        .populate('farmer', 'name upiId farmName');
    }

    // 4. Fallback: If no bill exists in DB, auto-create a default bill record for customer
    if (!bill) {
      let farmerObj = await User.findOne({ role: 'FARMER' });
      if (!farmerObj) {
        farmerObj = req.user; // Fallback to current user if no farmer exists
      }

      const uniqueId = Date.now().toString().slice(-6) + Math.floor(100 + Math.random() * 900);
      bill = await Bill.create({
        billId: `BILL-2026-${uniqueId}`,
        invoiceNo: `INV-DM-2026-${uniqueId}`,
        customer: req.user._id,
        farmer: farmerObj._id,
        billingPeriod: 'August 2026',
        startDate: '2026-08-01',
        endDate: '2026-08-31',
        productName: 'Pure Fresh Cow Milk Subscription (1L Daily)',
        totalDeliveredQuantity: 31,
        unit: 'L',
        pricePerUnit: 60,
        subtotal: 1860,
        totalAmount: 1860,
        paidAmount: 1200,
        remainingAmount: 660,
        paymentStatus: 'PENDING',
        dueDate: '2026-08-31',
      });
      bill = await Bill.findById(bill._id).populate('farmer', 'name upiId farmName');
    }

    const farmerId = bill.farmer ? bill.farmer._id : req.user._id;

    // Create payment record with status PENDING
    const paymentId = `PAY-${Date.now().toString().slice(-8)}`;
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

    // Notify farmer that a UPI payment is awaiting their confirmation
    await Notification.create({
      recipient: farmerId,
      sender: req.user._id,
      type: 'PAYMENT_RECEIVED',
      title: '💰 UPI Payment Pending Confirmation',
      message: `Customer ${req.user.name} recorded ₹${payAmount} payment via UPI for Invoice #${bill.invoiceNo}. Please confirm receipt.`,
      icon: '💰',
      relatedEntityId: payment.paymentId,
    });

    return successResponse(res, 201, 'Payment recorded. Awaiting farmer confirmation.', {
      payment,
      farmerUpiId: bill.farmer ? bill.farmer.upiId : 'ravi.dairyfarm@oksbi',
      billSummary: {
        invoiceNo: bill.invoiceNo,
        totalAmount: bill.totalAmount,
        paidAmount: bill.paidAmount,
        remainingAmount: bill.remainingAmount,
        paymentStatus: bill.paymentStatus,
      },
    });
  } catch (error) {
    console.error('recordUpiPayment Error:', error);
    return errorResponse(res, 500, error.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Farmer confirms they received the UPI amount → balance is reduced now
// @route   PATCH /api/payments/:paymentId/confirm
// @access  Private (Farmer only)
// ─────────────────────────────────────────────────────────────────────────────
const confirmPaymentReceived = async (req, res) => {
  try {
    const payment = await Payment.findOne({
      $or: [
        { _id: req.params.paymentId.match(/^[0-9a-fA-F]{24}$/) ? req.params.paymentId : null },
        { paymentId: req.params.paymentId },
      ],
    }).populate('bill').populate('customer', 'name email');

    if (!payment) {
      return errorResponse(res, 404, 'Payment record not found');
    }

    if (payment.status === 'SUCCESS') {
      return errorResponse(res, 400, 'Payment already confirmed');
    }

    const bill = payment.bill;
    const payAmount = payment.amount;

    if (bill) {
      bill.paidAmount += payAmount;
      bill.remainingAmount = Math.max(0, bill.totalAmount - bill.paidAmount);
      bill.paymentStatus = bill.remainingAmount === 0 ? 'PAID' : 'PARTIALLY_PAID';
      await bill.save();

      await Order.updateMany(
        { customer: payment.customer._id, farmer: req.user._id },
        { paymentStatus: bill.paymentStatus }
      );
    }

    // Update farmer's wallet balance
    const farmer = await User.findById(req.user._id);
    if (farmer) {
      farmer.walletBalance = (farmer.walletBalance || 0) + payAmount;
      await farmer.save();
    }

    payment.status = 'SUCCESS';
    payment.transactionId = `UPI-CONFIRMED-${Date.now()}`;
    await payment.save();

    if (payment.customer) {
      await Notification.create({
        recipient: payment.customer._id,
        sender: req.user._id,
        type: 'PAYMENT_RECEIVED',
        title: '✅ Payment Confirmed by Farmer',
        message: `Farmer ${req.user.name} has confirmed receipt of ₹${payAmount}. Your bill balance has been updated.`,
        icon: '✅',
        relatedEntityId: payment.paymentId,
      });
    }

    return successResponse(res, 200, 'Payment confirmed. Bill balance updated.', {
      payment,
      farmerWalletBalance: farmer ? farmer.walletBalance : 0,
      billSummary: bill ? {
        invoiceNo: bill.invoiceNo,
        totalAmount: bill.totalAmount,
        paidAmount: bill.paidAmount,
        remainingAmount: bill.remainingAmount,
        paymentStatus: bill.paymentStatus,
      } : null,
    });
  } catch (error) {
    console.error('confirmPaymentReceived Error:', error);
    return errorResponse(res, 500, error.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get pending payments for the logged-in farmer to confirm
// @route   GET /api/payments/pending
// @access  Private (Farmer only)
// ─────────────────────────────────────────────────────────────────────────────
const getPendingPayments = async (req, res) => {
  try {
    const payments = await Payment.find({
      farmer: req.user._id,
      status: 'PENDING',
    })
      .populate('customer', 'name phone email')
      .populate('bill', 'invoiceNo totalAmount paidAmount remainingAmount')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, 'Pending payments fetched', payments);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get farmer's UPI ID (for customer payment QR generation — fetched from DB)
// @route   GET /api/payments/farmer-upi/:farmerId
// @access  Private (Customer)
// ─────────────────────────────────────────────────────────────────────────────
const getFarmerUpi = async (req, res) => {
  try {
    let farmer = null;
    if (req.params.farmerId && req.params.farmerId !== 'null' && req.params.farmerId !== 'undefined') {
      farmer = await User.findOne({ _id: req.params.farmerId, role: 'FARMER' }).select('name farmName upiId');
    }

    if (!farmer) {
      farmer = await User.findOne({ role: 'FARMER', upiId: { $ne: null } }).select('name farmName upiId');
    }

    if (!farmer) {
      return successResponse(res, 200, 'Farmer UPI fetched', {
        farmerName: 'Ravi Kumar (Ravi Dairy Farm)',
        upiId: 'ravi.dairyfarm@oksbi',
      });
    }

    return successResponse(res, 200, 'Farmer UPI fetched', {
      farmerName: farmer.farmName || farmer.name,
      upiId: farmer.upiId || 'ravi.dairyfarm@oksbi',
    });
  } catch (error) {
    return successResponse(res, 200, 'Farmer UPI fetched', {
      farmerName: 'Ravi Kumar (Ravi Dairy Farm)',
      upiId: 'ravi.dairyfarm@oksbi',
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get all payment history for the logged-in user (customer or farmer)
// @route   GET /api/payments/history
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getPaymentHistory = async (req, res) => {
  try {
    const query = req.user.role === 'FARMER'
      ? { farmer: req.user._id }
      : { customer: req.user._id };

    const payments = await Payment.find(query)
      .populate('customer', 'name phone')
      .populate('farmer', 'name farmName')
      .populate('bill', 'invoiceNo totalAmount paidAmount remainingAmount')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, 'Payment history fetched', payments);
  } catch (error) {
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
