require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const DailyInventory = require('../src/models/DailyInventory');
const Order = require('../src/models/Order');
const Subscription = require('../src/models/Subscription');
const Delivery = require('../src/models/Delivery');
const Bill = require('../src/models/Bill');
const Payment = require('../src/models/Payment');
const Notification = require('../src/models/Notification');
const ProductExchange = require('../src/models/ProductExchange');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🌱 Connected to MongoDB Atlas for database seeding...');

    // Clear existing collection data
    await User.deleteMany({});
    await Product.deleteMany({});
    await DailyInventory.deleteMany({});
    await Order.deleteMany({});
    await Subscription.deleteMany({});
    await Delivery.deleteMany({});
    await Bill.deleteMany({});
    await Payment.deleteMany({});
    await Notification.deleteMany({});
    await ProductExchange.deleteMany({});

    console.log('🧹 Existing collection data cleared.');

    // 1. Create Farmers & Customers
    const farmerRavi = await User.create({
      name: 'Ravi Kumar',
      email: 'ravi@ravifarm.com',
      phone: '9876543210',
      password: 'password123',
      role: 'FARMER',
      farmName: 'Ravi Dairy Farm',
      categories: ['MILK', 'MILK_PRODUCT'],
      dairyCowsCount: 28,
      dailyYieldEstimate: '140 L',
      address: 'Survey No. 45, Palani Road',
      city: 'Dindigul',
      district: 'Dindigul',
      state: 'Tamil Nadu',
      pincode: '624002',
      location: { type: 'Point', coordinates: [77.9803, 10.3673] },
    });

    const farmerArjun = await User.create({
      name: 'Arjun Pillai',
      email: 'arjun@pillai.com',
      phone: '9876543213',
      password: 'password123',
      role: 'FARMER',
      farmName: 'Pillai A2 Gir Cow Farm',
      categories: ['MILK', 'MILK_PRODUCT'],
      dairyCowsCount: 35,
      dailyYieldEstimate: '160 L',
      address: 'Survey No. 12, Tirunelveli Main Road',
      city: 'Tirunelveli',
      district: 'Tirunelveli',
      state: 'Tamil Nadu',
      pincode: '627001',
      location: { type: 'Point', coordinates: [77.7567, 8.7139] },
    });

    const customerPriya = await User.create({
      name: 'Priya Sharma',
      email: 'priya@example.com',
      phone: '9876500001',
      password: 'password123',
      role: 'CUSTOMER',
      address: '12 Nehru Street, Dindigul - 624001',
      city: 'Dindigul',
      district: 'Dindigul',
      state: 'Tamil Nadu',
      pincode: '624001',
      location: { type: 'Point', coordinates: [77.9815, 10.3685] },
    });

    console.log('✅ Users seeded successfully (Farmer Ravi, Farmer Arjun, Customer Priya)');

    // 2. Create Products
    const milkProduct1 = await Product.create({
      productId: 'DM-MILK-10001',
      name: 'Pure Fresh Cow Milk',
      category: 'MILK',
      description: '100% natural, farm-fresh cow milk collected every morning at 4:30 AM. Chilled immediately to 4°C.',
      unit: 'L',
      price: 60,
      farmer: farmerRavi._id,
      location: 'Dindigul',
      emoji: '🥛',
      fatContent: '4.2% Fat',
      snfContent: '8.5% SNF',
      milkingSlot: '4:30 AM Milking',
      packaging: 'Eco Glass Bottle',
      isOrganic: true,
      isA2: false,
      status: 'AVAILABLE',
    });

    const milkProduct2 = await Product.create({
      productId: 'DM-MILK-10002',
      name: 'A2 Native Gir Cow Milk',
      category: 'MILK',
      description: 'Pure A2 Beta-Casein milk from indigenous Gir cows fed on organic pasture fields.',
      unit: 'L',
      price: 85,
      farmer: farmerArjun._id,
      location: 'Tirunelveli',
      emoji: '🥛',
      fatContent: '4.8% Fat',
      snfContent: '9.0% SNF',
      milkingSlot: '4:00 AM Vedic Milking',
      packaging: 'Sterilized Glass Bottle',
      isOrganic: true,
      isA2: true,
      status: 'AVAILABLE',
    });

    const gheeProduct = await Product.create({
      productId: 'DM-DAI-10003',
      name: 'Traditional Bilona Cow Ghee',
      category: 'MILK_PRODUCT',
      description: 'Golden granular ghee prepared using traditional wooden churners (Bilona method).',
      unit: '500g',
      price: 750,
      farmer: farmerRavi._id,
      location: 'Dindigul',
      emoji: '🧈',
      fatContent: '99.8% Pure Milk Fat',
      packaging: 'Glass Jar',
      isOrganic: true,
      status: 'AVAILABLE',
    });

    console.log('✅ Products seeded successfully (Cow Milk, A2 Gir Milk, Bilona Ghee)');

    // 3. Create Today's Daily Inventory
    const today = new Date().toISOString().slice(0, 10);
    await DailyInventory.create({
      product: milkProduct1._id,
      productId: milkProduct1.productId,
      farmer: farmerRavi._id,
      date: today,
      availableQuantity: 60,
      soldQuantity: 25,
      remainingQuantity: 35,
      unit: 'L',
      price: 60,
      status: 'AVAILABLE',
    });

    await DailyInventory.create({
      product: milkProduct2._id,
      productId: milkProduct2.productId,
      farmer: farmerArjun._id,
      date: today,
      availableQuantity: 45,
      soldQuantity: 25,
      remainingQuantity: 20,
      unit: 'L',
      price: 85,
      status: 'AVAILABLE',
    });

    console.log("✅ Today's Daily Inventory seeded");

    // 4. Create Active Milk Subscription
    const subscription = await Subscription.create({
      subscriptionId: 'SUB-DM-2026-10001',
      customer: customerPriya._id,
      farmer: farmerRavi._id,
      product: milkProduct1._id,
      quantity: 1,
      unit: 'L',
      frequency: 'DAILY',
      deliverySlot: 'MORNING',
      startDate: '2026-08-01',
      durationDays: 30,
      pricePerUnit: 60,
      estimatedMonthlyAmount: 1860,
      status: 'ACTIVE',
    });

    // 5. Create Monthly Bill & Notification
    const bill = await Bill.create({
      billId: 'BILL-2026-890123',
      invoiceNo: 'INV-DM-2026-1001',
      customer: customerPriya._id,
      farmer: farmerRavi._id,
      subscription: subscription._id,
      billingPeriod: 'August 2026',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      productName: milkProduct1.name,
      totalDeliveredQuantity: 31,
      unit: 'L',
      pricePerUnit: 60,
      subtotal: 1860,
      totalAmount: 1860,
      paidAmount: 1200,
      remainingAmount: 660,
      paymentStatus: 'PARTIALLY_PAID',
      dueDate: '2026-08-31',
    });

    await Notification.create({
      recipient: customerPriya._id,
      sender: farmerRavi._id,
      type: 'PAYMENT_REMINDER',
      title: '💳 Payment Reminder',
      message: `Farmer Ravi Kumar sent a reminder: ₹660 is pending for August Milk Subscription.`,
      icon: '💰',
    });

    // 6. Create Product Exchange Request
    await ProductExchange.create({
      exchangeId: 'EX-2026-1001',
      senderFarmer: farmerRavi._id,
      exchangeType: 'SWAP',
      requestedProduct: 'Pure Fresh Cow Milk',
      requiredQuantity: 10,
      unit: 'L',
      offeredProduct: '1 Jar (500g) Bilona Ghee',
      location: 'Dindigul',
      notes: 'Morning demand exceeded yield by 10L. Offering 500g Bilona Ghee in return.',
      status: 'PENDING',
    });

    console.log('✅ Subscriptions, Monthly Bills, Notifications, and Exchange Requests seeded!');
    console.log('🎉 Database seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding Error:', error.message);
    process.exit(1);
  }
};

seedData();
