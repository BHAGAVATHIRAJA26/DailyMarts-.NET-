const express = require('express');
const cors = require('cors');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const orderRoutes = require('./routes/orderRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const billRoutes = require('./routes/billRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const cancellationRoutes = require('./routes/cancellationRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const exchangeRoutes = require('./routes/exchangeRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);

// Root health check endpoint (for Render / uptime pings)
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: '🌿 DailyMarts REST API Server Active',
    apiHealth: '/api/health',
    timestamp: new Date(),
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'DailyMarts Backend REST API running',
    timestamp: new Date(),
  });
});

// REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/cancellations', cancellationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/exchanges', exchangeRoutes);
app.use('/api/farmers', exchangeRoutes); // Alias for /api/farmers/nearby
app.use('/api/reports', reportRoutes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

module.exports = app;
