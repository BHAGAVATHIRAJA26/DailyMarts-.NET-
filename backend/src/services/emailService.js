const { sendEmail } = require('../config/email');

/**
 * Helper to build styled HTML email template for DailyMarts
 */
const buildEmailTemplate = ({ title, recipientName, farmerName, farmName, bodyContent, dataTable, actionBtn }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; margin: 0; padding: 20px; color: #333; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #16a34a, #15803d); padding: 28px 24px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; }
        .header p { margin: 6px 0 0; font-size: 14px; opacity: 0.9; }
        .content { padding: 30px 24px; }
        .greeting { font-size: 18px; font-weight: 600; color: #1f2937; margin-bottom: 16px; }
        .message-box { background: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; border-radius: 8px; margin: 20px 0; font-size: 15px; color: #166534; line-height: 1.6; }
        .data-table { width: 100%; border-collapse: collapse; margin: 20px 0; background: #fafafa; border-radius: 10px; overflow: hidden; }
        .data-table th, .data-table td { padding: 12px 16px; text-align: left; font-size: 14px; border-bottom: 1px solid #edf2f7; }
        .data-table th { background: #f1f5f9; color: #475569; font-weight: 600; }
        .farmer-badge { background: #e0e7ff; color: #3730a3; padding: 12px 16px; border-radius: 10px; font-size: 14px; margin-top: 20px; display: flex; align-items: center; justify-content: space-between; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
        .btn { display: inline-block; background: #16a34a; color: white !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🌿 DailyMarts</h1>
          <p>Fresh Agricultural & Dairy Products Delivered Daily</p>
        </div>
        <div class="content">
          <div class="greeting">Hello ${recipientName || 'Valued User'},</div>
          <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">${bodyContent}</p>
          
          ${dataTable ? `
            <table class="data-table">
              <thead>
                <tr>
                  <th>Detail</th>
                  <th>Information</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(dataTable).map(([key, val]) => `
                  <tr>
                    <td style="font-weight: 600; color: #374151;">${key}</td>
                    <td style="color: #1f2937;">${val}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}

          ${farmerName ? `
            <div class="farmer-badge">
              <span>🌾 <strong>From Farmer:</strong> ${farmerName} ${farmName ? `(${farmName})` : ''}</span>
            </div>
          ` : ''}

          ${actionBtn ? `<div style="text-align: center; margin-top: 24px;"><a href="${actionBtn.url}" class="btn">${actionBtn.text}</a></div>` : ''}
        </div>
        <div class="footer">
          <p>Sent via DailyMarts Direct Farmer-Customer Network</p>
          <p>Dindigul, Tamil Nadu, India • Direct Farm-to-Home Delivery</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Welcome Email upon User Registration
 */
const sendWelcomeEmail = async (user) => {
  const isFarmer = user.role === 'FARMER';
  const html = buildEmailTemplate({
    title: `Welcome to DailyMarts, ${user.name}!`,
    recipientName: user.name,
    bodyContent: isFarmer
      ? `Thank you for registering as a Partner Farmer on DailyMarts! You can now manage your daily milk & agricultural inventory, track subscriptions, receive UPI payments directly, and exchange products with nearby farmers.`
      : `Thank you for joining DailyMarts! You are now connected with local certified farmers for fresh milk, dairy products, vegetables, and meat delivered fresh to your doorstep every morning.`,
    dataTable: {
      'Account Type': isFarmer ? 'Farmer Partner' : 'Customer',
      'Registered Email': user.email,
      'Phone': user.phone,
      'Location': user.city || user.location || 'Dindigul',
      ...(isFarmer && user.upiId ? { 'Farmer UPI ID': user.upiId } : {}),
    },
    actionBtn: {
      text: isFarmer ? '🌾 Go to Farmer Dashboard' : '🛒 Explore Fresh Products',
      url: isFarmer ? 'http://localhost:5173/farmer/dashboard' : 'http://localhost:5173/customer/dashboard',
    },
  });

  return await sendEmail({
    to: user.email || 'bhagavathiraja.s26@gmail.com',
    subject: `Welcome to DailyMarts — Fresh Dairy & Agricultural Products 🌿`,
    html,
  });
};

/**
 * Generic Farmer to Customer Email
 */
const sendFarmerToCustomerEmail = async ({ farmer, customer, subject, message, data }) => {
  const html = buildEmailTemplate({
    title: subject || 'Message from your Farmer',
    recipientName: customer.name,
    farmerName: farmer.name,
    farmName: farmer.farmName,
    bodyContent: message || 'You have received an update regarding your daily product delivery.',
    dataTable: data || null,
  });

  return await sendEmail({
    to: customer.email || 'bhagavathiraja.s26@gmail.com',
    subject: subject || `DailyMarts — Update from ${farmer.farmName || farmer.name}`,
    html,
    text: `${message}\nFrom: ${farmer.name}`,
  });
};

/**
 * Payment Reminder Email
 */
const sendPaymentReminderEmail = async (farmer, customer, amount, dueDate, invoiceNo) => {
  const html = buildEmailTemplate({
    title: 'Payment Reminder',
    recipientName: customer.name,
    farmerName: farmer?.name || 'Your Farmer',
    farmName: farmer?.farmName || 'DailyMarts Partner',
    bodyContent: `Your farmer has sent a friendly reminder for your outstanding balance of <strong>₹${amount}</strong>. Please complete the payment via UPI to ensure uninterrupted daily delivery.`,
    dataTable: {
      'Invoice Number': `#${invoiceNo || 'INV-DM-2026-1001'}`,
      'Pending Amount': `₹${amount}`,
      'Due Date': dueDate || 'End of Month',
      'Farmer UPI ID': farmer?.upiId || 'ravi.dairyfarm@oksbi',
    },
    actionBtn: {
      text: '💳 Pay Now via UPI QR',
      url: 'http://localhost:5173/customer/bills',
    },
  });

  return await sendEmail({
    to: customer.email || 'bhagavathiraja.s26@gmail.com',
    subject: `DailyMarts — Payment Reminder (₹${amount}) from ${farmer?.farmName || farmer?.name || 'Farmer'}`,
    html,
    text: `Payment reminder of ₹${amount} due on ${dueDate}. Farmer UPI: ${farmer?.upiId}`,
  });
};

/**
 * Order / Delivery Confirmation Email
 */
const sendOrderConfirmationEmail = async (user, order) => {
  const html = buildEmailTemplate({
    title: 'Order Confirmed',
    recipientName: user.name,
    farmerName: order.farmerName || 'DailyMarts Local Farmer',
    bodyContent: `Your order <strong>#${order.orderId || order._id}</strong> has been successfully confirmed and scheduled for daily delivery.`,
    dataTable: {
      'Product': order.productName || 'Fresh Cow Milk',
      'Quantity': `${order.quantity || 1} ${order.unit || 'Litre'}`,
      'Total Amount': `₹${order.totalAmount || 60}`,
      'Delivery Slot': order.deliverySlot || 'Morning (6:00 AM - 7:30 AM)',
      'Status': 'ACTIVE & SCHEDULED',
    },
  });

  return await sendEmail({
    to: user.email || 'bhagavathiraja.s26@gmail.com',
    subject: `DailyMarts — Order Confirmed #${order.orderId || 'DM-ORDER'}`,
    html,
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendFarmerToCustomerEmail,
  sendPaymentReminderEmail,
  sendOrderConfirmationEmail,
};
