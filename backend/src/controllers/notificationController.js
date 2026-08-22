const Notification = require('../models/Notification');
const Bill = require('../models/Bill');
const User = require('../models/User');
const { sendPaymentReminderEmail, sendFarmerToCustomerEmail } = require('../services/emailService');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// ─── GET /api/notifications ───────────────────────────────────────────────────
// @desc    Get user notifications (Customer or Farmer)
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('sender', 'name farmName role')
      .sort({ createdAt: -1 })
      .limit(50);

    return successResponse(res, 200, `Found ${notifications.length} notifications`, notifications);
  } catch (error) {
    console.error('getNotifications Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

// ─── PATCH /api/notifications/:id/read ───────────────────────────────────────
// @desc    Mark single or all notifications read
// @access  Private
const markRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (id === 'read-all') {
      await Notification.updateMany({ recipient: req.user._id }, { isRead: true });
      return successResponse(res, 200, 'All notifications marked read');
    }

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const notification = await Notification.findOneAndUpdate(
      {
        $or: [
          ...(isObjectId ? [{ _id: id }] : []),
          { relatedEntityId: id },
        ],
        recipient: req.user._id,
      },
      { isRead: true },
      { new: true }
    );

    return successResponse(res, 200, 'Notification marked read', notification);
  } catch (error) {
    console.error('markRead Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

// ─── POST /api/notifications/remind/:customerId ─────────────────────────────
// @desc    Send payment reminder to customer (Farmer only)
// @access  Private (Farmer)
const sendPaymentReminder = async (req, res) => {
  try {
    const { customerId } = req.params;

    const customer = await User.findById(customerId);
    if (!customer) {
      return errorResponse(res, 404, 'Customer not found');
    }

    // Find outstanding bill
    const bill = await Bill.findOne({
      customer: customer._id,
      farmer: req.user._id,
      remainingAmount: { $gt: 0 },
    }).sort({ createdAt: -1 });

    if (!bill) {
      return errorResponse(res, 404, 'No pending bill found for this customer');
    }

    const pendingAmount = bill.remainingAmount;
    const dueDateStr = bill.dueDate ? String(bill.dueDate).slice(0, 10) : 'End of Month';
    const invoiceNo = bill.invoiceNo || bill.billId;

    // Prevent spamming reminders (check if reminder sent in last 2 hours)
    const recentReminder = await Notification.findOne({
      recipient: customer._id,
      sender: req.user._id,
      type: 'PAYMENT_REMINDER',
      createdAt: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    });

    if (recentReminder) {
      return errorResponse(res, 400, 'A payment reminder was already sent to this customer recently. Please wait 2 hours.');
    }

    // 1. Create In-App Notification
    const notif = await Notification.create({
      recipient: customer._id,
      sender: req.user._id,
      type: 'PAYMENT_REMINDER',
      title: '💳 Payment Reminder',
      message: `Farmer ${req.user.name} sent a reminder: ₹${pendingAmount} is pending for Invoice #${invoiceNo}. Due by ${dueDateStr}.`,
      icon: '💰',
      relatedEntityId: invoiceNo,
    });

    // 2. Trigger Email via Resend (non-blocking catch)
    sendPaymentReminderEmail(req.user, customer, pendingAmount, dueDateStr, invoiceNo).catch((err) =>
      console.error('Email reminder error:', err.message)
    );

    return successResponse(res, 200, `Payment reminder sent successfully to ${customer.name}`, notif);
  } catch (error) {
    console.error('sendPaymentReminder Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

// ─── POST /api/notifications/send-email ─────────────────────────────────────
// @desc    Farmer sends custom email to customer
// @access  Private (Farmer)
const sendCustomEmailToCustomer = async (req, res) => {
  try {
    const { customerId, subject, message, data } = req.body;

    if (!customerId) {
      return errorResponse(res, 400, 'customerId is required');
    }

    const customer = await User.findById(customerId);
    if (!customer) {
      return errorResponse(res, 404, 'Customer not found');
    }

    const farmer = req.user;

    // Send Email via Resend API
    sendFarmerToCustomerEmail({
      farmer,
      customer,
      subject: subject || `Update from ${farmer.farmName || farmer.name}`,
      message: message || 'Your farmer has shared an update regarding product availability/deliveries.',
      data: data || null,
    }).catch((err) => console.error('Custom email error:', err.message));

    // Create In-App Notification
    const notif = await Notification.create({
      recipient: customer._id,
      sender: farmer._id,
      type: 'ANNOUNCEMENT',
      title: subject || `📧 Email from ${farmer.farmName || farmer.name}`,
      message: message || 'Check your inbox for a message from your farmer.',
      icon: '📧',
    });

    return successResponse(res, 200, `Email sent to ${customer.name} (${customer.email})`, notif);
  } catch (error) {
    console.error('sendCustomEmailToCustomer Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

module.exports = {
  getNotifications,
  markRead,
  sendPaymentReminder,
  sendCustomEmailToCustomer,
};
