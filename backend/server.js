require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');
const initScheduledJobs = require('./src/services/cronService');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB Atlas
connectDB();

// Initialize Node-cron scheduled background jobs
initScheduledJobs();

const server = app.listen(PORT, () => {
  console.log(`🚀 DailyMarts Backend Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`📡 API Health Check: http://localhost:${PORT}/api/health`);
});

// Unhandled Rejection Safety
process.on('unhandledRejection', (err) => {
  console.error(`❌ Unhandled Error Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});
