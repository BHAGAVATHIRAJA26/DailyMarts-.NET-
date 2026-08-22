const Order = require('../models/Order');
const Bill = require('../models/Bill');
const Delivery = require('../models/Delivery');
const Subscription = require('../models/Subscription');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// @desc    Get aggregated sales statistics for farmer (Real MongoDB calculations only)
// @route   GET /api/reports/farmer/stats
// @access  Private (Farmer)
const getFarmerStats = async (req, res) => {
  try {
    const farmerId = req.user._id;
    const today = new Date().toISOString().slice(0, 10);

    // 1. Today's sales & revenue
    const todayOrders = await Order.find({
      farmer: farmerId,
      deliveryDate: today,
      orderStatus: { $ne: 'CANCELLED' },
    });

    const todaySalesCount = todayOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // 2. All-time revenue aggregation from farmer bills
    const allBills = await Bill.find({ farmer: farmerId });
    const monthlyRevenue = allBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const pendingPayments = allBills.reduce((sum, b) => sum + (b.remainingAmount || 0), 0);
    const totalPaid = allBills.reduce((sum, b) => sum + (b.paidAmount || 0), 0);

    // 3. Active customers count
    const activeSubs = await Subscription.find({ farmer: farmerId, status: 'ACTIVE' });
    const activeCustomersCount = new Set(activeSubs.map((s) => s.customer.toString())).size;

    return successResponse(res, 200, 'Farmer statistics calculated', {
      todaySales: todaySalesCount,
      todayRevenue: todayRevenue,
      monthlyRevenue: monthlyRevenue,
      pendingPayments: pendingPayments,
      totalPaid: totalPaid,
      activeCustomers: activeCustomersCount,
      walletBalance: req.user.walletBalance || 0,
    });
  } catch (error) {
    console.error('getFarmerStats Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

module.exports = { getFarmerStats };
