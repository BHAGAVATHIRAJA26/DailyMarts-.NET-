const Notification = require('../models/Notification');
const Bill = require('../models/Bill');
const User = require('../models/User');
const { sendPaymentReminderEmail, sendFarmerToCustomerEmail } = require('../services/emailService');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30);

    return successResponse(res, 200, `Found ${notifications.length} notifications`, notifications);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

// @desc    Mark notification read
// @route   PATCH /api/notifications/:id/read
// @access  Private
const markRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (id === 'read-all') {
      await Notification.updateMany({ recipient: req.user._id }, { isRead: true });
      return successResponse(res, 200, 'All notifications marked read');
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: req.user._id },
      { isRead: true },
      { new: true }
    );

    return successResponse(res, 200, 'Notification marked read', notification);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

// @desc    Send payment reminder to customer (Farmer only)
// @route   POST /api/notifications/remind/:customerId
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
    });

    const pendingAmount = bill ? bill.remainingAmount : 660;
    const dueDate = bill ? (bill.dueDate ? bill.dueDate.toISOString().split('T')[0] : '2026-08-31') : '2026-08-31';
    const invoiceNo = bill ? bill.invoiceNo : 'INV-DM-2026-1001';

    // Prevent spamming reminders (check if reminder sent in last 2 hours)
    const recentReminder = await Notification.findOne({
      recipient: customer._id,
      sender: req.user._id,
      type: 'PAYMENT_REMINDER',
      createdAt: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    });

    if (recentReminder) {
      return errorResponse(res, 400, 'A payment reminder was already sent to this customer recently');
    }

    // 1. Create In-App Notification
    const notif = await Notification.create({
      recipient: customer._id,
      sender: req.user._id,
      type: 'PAYMENT_REMINDER',
      title: '💳 Payment Reminder',
      message: `Farmer ${req.user.name} sent a reminder: ₹${pendingAmount} is pending for your monthly bill. Due by ${dueDate}.`,
      icon: '💰',
      relatedEntityId: invoiceNo,
    });

    // 2. Trigger Email via Resend
    await sendPaymentReminderEmail(req.user, customer, pendingAmount, dueDate, invoiceNo);

    return successResponse(res, 200, `Payment reminder email sent successfully to ${customer.name}`, notif);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

// @desc    Farmer sends custom email to customer with content & data
// @route   POST /api/notifications/send-email
// @access  Private (Farmer)
const sendCustomEmailToCustomer = async (req, res) => {
  try {
    const { customerId, subject, message, data } = req.body;

    const customer = await User.findById(customerId);
    if (!customer) {
      return errorResponse(res, 404, 'Customer not found');
    }

    const farmer = req.user;

    // 1. Send Email via Resend API
    await sendFarmerToCustomerEmail({
      farmer,
      customer,
      subject: subject || `Update from ${farmer.farmName || farmer.name}`,
      message: message || 'Your farmer has shared an update regarding product availability/deliveries.',
      data: data || null,
    });

    // 2. Create In-App Notification
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
    return errorResponse(res, 500, error.message);
  }
};

module.exports = {
  getNotifications,
  markRead,
  sendPaymentReminder,
  sendCustomEmailToCustomer,
};
