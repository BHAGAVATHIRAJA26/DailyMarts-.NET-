const cron = require('node-cron');
const Subscription = require('../models/Subscription');
const Delivery = require('../models/Delivery');
const Bill = require('../models/Bill');
const Cancellation = require('../models/Cancellation');

const generateInvoiceId = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(100 + Math.random() * 900);
  const year = new Date().getFullYear();
  return {
    invoiceNo: `INV-DM-${year}-${ts}-${rand}`,
    billId: `BILL-${year}-${ts}-${rand}`,
  };
};

const initScheduledJobs = () => {
  // 1. Daily midnight job: Generate daily delivery records for active subscriptions
  cron.schedule('0 0 * * *', async () => {
    console.log('⏰ Running Daily Subscription Delivery Generator Job...');
    try {
      const today = new Date().toISOString().slice(0, 10);
      const activeSubscriptions = await Subscription.find({ status: 'ACTIVE' });

      for (const sub of activeSubscriptions) {
        // Check if day is cancelled
        const cancellation = await Cancellation.findOne({
          subscription: sub._id,
          $or: [
            { cancellationType: 'SINGLE_DAY', skipDate: today },
            { cancellationType: 'DATE_RANGE', startDate: { $lte: today }, endDate: { $gte: today } },
          ],
        });

        if (cancellation) {
          console.log(`Skipping delivery for Subscription ${sub.subscriptionId} today (Cancelled/Skipped by customer).`);
          continue;
        }

        // Create pending daily delivery entry
        await Delivery.updateOne(
          { subscription: sub._id, date: today },
          {
            $setOnInsert: {
              subscription: sub._id,
              customer: sub.customer,
              farmer: sub.farmer,
              product: sub.product,
              date: today,
              deliverySlot: sub.deliverySlot,
              requestedQuantity: sub.quantity,
              deliveredQuantity: sub.quantity,
              unit: sub.unit,
              pricePerUnit: sub.pricePerUnit,
              totalCost: sub.quantity * sub.pricePerUnit,
              status: 'PENDING',
            },
          },
          { upsert: true }
        );
      }
      console.log('✅ Daily subscription delivery records updated successfully.');
    } catch (err) {
      console.error('❌ Daily Cron Error:', err.message);
    }
  });

  // 2. Monthly billing job (Runs at 1:00 AM on 1st of every month)
  cron.schedule('0 1 1 * *', async () => {
    console.log('⏰ Running Monthly Bill Generator Job...');
    try {
      // Calculate previous month date range
      const now = new Date();
      const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      const startDateStr = firstDayPrevMonth.toISOString().slice(0, 10);
      const endDateStr = lastDayPrevMonth.toISOString().slice(0, 10);
      const billingPeriodStr = firstDayPrevMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

      const activeSubscriptions = await Subscription.find({ status: 'ACTIVE' }).populate('product');

      for (const sub of activeSubscriptions) {
        // Aggregate actual delivered quantities for the subscription during the month
        const deliveries = await Delivery.find({
          subscription: sub._id,
          date: { $gte: startDateStr, $lte: endDateStr },
          status: 'DELIVERED',
        });

        const totalDeliveredQuantity = deliveries.reduce((sum, d) => sum + (d.deliveredQuantity || 0), 0);
        const subtotal = totalDeliveredQuantity * sub.pricePerUnit;

        if (subtotal > 0) {
          const { invoiceNo, billId } = generateInvoiceId();

          await Bill.create({
            billId,
            invoiceNo,
            customer: sub.customer,
            farmer: sub.farmer,
            subscription: sub._id,
            billingPeriod: billingPeriodStr,
            startDate: startDateStr,
            endDate: endDateStr,
            productName: sub.product?.name || 'Milk Subscription',
            totalDeliveredQuantity,
            unit: sub.unit,
            pricePerUnit: sub.pricePerUnit,
            subtotal,
            totalAmount: subtotal,
            paidAmount: 0,
            remainingAmount: subtotal,
            paymentStatus: 'PENDING',
            dueDate: new Date(now.getFullYear(), now.getMonth(), 10).toISOString().slice(0, 10),
          });
        }
      }
      console.log('✅ Monthly bills generated successfully.');
    } catch (err) {
      console.error('❌ Monthly Bill Cron Error:', err.message);
    }
  });
};

module.exports = initScheduledJobs;
