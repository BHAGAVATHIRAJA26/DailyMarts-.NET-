const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      unique: true,
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['MILK', 'MILK_PRODUCT', 'VEGETABLE', 'CHICKEN', 'MEAT', 'OTHER'],
      required: true,
    },
    description: { type: String, trim: true },
    unit: { type: String, required: true, default: 'L' }, // L, kg, 500g, 250g, bunch
    price: { type: Number, required: true },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    location: { type: String, required: true, default: 'Dindigul' },
    emoji: { type: String, default: '🥛' },

    // Specialized Milk & Dairy Attributes
    fatContent: { type: String, default: null }, // e.g. "4.5% Fat"
    snfContent: { type: String, default: null }, // e.g. "8.5% SNF"
    milkingSlot: { type: String, default: null }, // e.g. "4:30 AM Milking"
    packaging: { type: String, default: 'Eco Glass Bottle' },
    isOrganic: { type: Boolean, default: true },
    isA2: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ['AVAILABLE', 'LIMITED', 'SOLD_OUT', 'INACTIVE'],
      default: 'AVAILABLE',
    },
    rating: { type: Number, default: 4.8 },
    reviewCount: { type: Number, default: 50 },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', productId: 'text', location: 'text' });

module.exports = mongoose.model('Product', productSchema);
