const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['CUSTOMER', 'FARMER'],
      default: 'CUSTOMER',
      required: true,
    },
    // Farmer specific fields
    farmName: {
      type: String,
      trim: true,
      default: null,
    },
    categories: [
      {
        type: String,
        enum: ['MILK', 'MILK_PRODUCT', 'VEGETABLE', 'CHICKEN', 'MEAT', 'OTHER'],
      },
    ],
    dairyCowsCount: { type: Number, default: 0 },
    dailyYieldEstimate: { type: String, default: null },
    isPurityCertified: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: true },
    // UPI ID (VPA) collected during farmer registration for payment QR generation
    upiId: { type: String, default: null, trim: true },
    // Running wallet balance — incremented when farmer clicks "Mark Received"
    walletBalance: { type: Number, default: 0 },

    // Location fields
    address: { type: String, required: true },
    city: { type: String, required: true },
    district: { type: String, default: 'Dindigul' },
    state: { type: String, default: 'Tamil Nadu' },
    pincode: { type: String, default: '624001' },

    // GeoJSON Location format for geospatial 2dsphere indexing
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [77.9803, 10.3673], // Default Dindigul coordinates
      },
    },
  },
  { timestamps: true }
);

// 2dsphere Index for Geospatial nearby search
userSchema.index({ location: '2dsphere' });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
