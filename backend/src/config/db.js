const mongoose = require('mongoose');

const MONGODB_URI_FALLBACK =
  'mongodb+srv://bhagavathirajas26_db_user:DsdqNtTdlYTddMVp@cluster0.e8335yu.mongodb.net/dailymarts?retryWrites=true&w=majority';

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || MONGODB_URI_FALLBACK;
    const conn = await mongoose.connect(mongoUri, {
      autoIndex: true,
    });
    console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host} / ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
