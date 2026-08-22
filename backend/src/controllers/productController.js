const Product = require('../models/Product');
const DailyInventory = require('../models/DailyInventory');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// ─── Helper: generate unique product ID without race condition ─────────────────
const generateProductId = (category) => {
  const prefix = category ? category.slice(0, 3).toUpperCase() : 'PRD';
  const ts = Date.now().toString(36).toUpperCase(); // base36 timestamp — unique per ms
  return `DM-${prefix}-${ts}`;
};

// ─── Category normalization: accepts any case / plural / short forms ───────────
const normalizeCategory = (cat) => {
  if (!cat) return null;
  const c = cat.toUpperCase().trim().replace(/\s+/g, '_');
  const MAP = {
    MILK: 'MILK',
    MILKS: 'MILK',
    DAIRY: 'MILK',
    MILK_PRODUCT: 'MILK_PRODUCT',
    MILK_PRODUCTS: 'MILK_PRODUCT',
    MILKPRODUCT: 'MILK_PRODUCT',
    MILKPRODUCTS: 'MILK_PRODUCT',
    GHEE: 'MILK_PRODUCT',
    CURD: 'MILK_PRODUCT',
    BUTTER: 'MILK_PRODUCT',
    PANEER: 'MILK_PRODUCT',
    VEGETABLE: 'VEGETABLE',
    VEGETABLES: 'VEGETABLE',
    VEG: 'VEGETABLE',
    VEGGIES: 'VEGETABLE',
    CHICKEN: 'CHICKEN',
    POULTRY: 'CHICKEN',
    MEAT: 'MEAT',
    MUTTON: 'MEAT',
    BEEF: 'MEAT',
    OTHER: 'OTHER',
    OTHERS: 'OTHER',
  };
  return MAP[c] || 'OTHER';
};

const EMOJI_MAP = {
  MILK: '🥛',
  MILK_PRODUCT: '🧈',
  VEGETABLE: '🥬',
  CHICKEN: '🐔',
  MEAT: '🥩',
  OTHER: '🌾',
};

// ─── GET /api/products ────────────────────────────────────────────────────────
// @desc    Get all AVAILABLE products or search by query
// @access  Public
const searchProducts = async (req, res) => {
  try {
    const { name, productId, category, location, farmerId, availability, status } = req.query;

    const filter = {};

    // By default only show AVAILABLE products to customers — unless farmer filters by their own ID
    // or an explicit status filter is passed
    if (status) {
      filter.status = status.toUpperCase();
    } else if (!farmerId) {
      // Default: only show products that are available (not inactive/sold out)
      filter.status = { $in: ['AVAILABLE', 'LIMITED'] };
    }

    if (name) {
      filter.name = { $regex: name.trim(), $options: 'i' };
    }

    if (productId) {
      filter.productId = { $regex: productId.trim(), $options: 'i' };
    }

    if (category) {
      const normalized = normalizeCategory(category);
      if (normalized) filter.category = normalized;
    }

    if (location && location !== 'All Locations') {
      filter.location = { $regex: location.trim(), $options: 'i' };
    }

    if (farmerId) {
      filter.farmer = farmerId;
      // Farmers can see all their own products regardless of status
      delete filter.status;
    }

    if (availability === 'available') {
      filter.status = 'AVAILABLE';
    }

    const products = await Product.find(filter)
      .populate('farmer', 'name farmName location phone rating city')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, `Found ${products.length} products`, products);
  } catch (error) {
    console.error('searchProducts Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

// ─── GET /api/products/:id ────────────────────────────────────────────────────
// @desc    Get single product by MongoDB _id or custom productId
// @access  Public
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);

    const product = await Product.findOne({
      $or: [
        ...(isObjectId ? [{ _id: id }] : []),
        { productId: id },
      ],
    }).populate('farmer', 'name farmName location phone rating address city upiId');

    if (!product) {
      return errorResponse(res, 404, 'Product not found');
    }

    return successResponse(res, 200, 'Product details fetched', product);
  } catch (error) {
    console.error('getProductById Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

// ─── POST /api/products ───────────────────────────────────────────────────────
// @desc    Create new product (Farmer only)
// @access  Private (Farmer)
const createProduct = async (req, res) => {
  try {
    const {
      name, category, description, unit, price,
      fatContent, snfContent, packaging, isOrganic, isA2, milkingSlot,
    } = req.body;

    if (!name || !price) {
      return errorResponse(res, 400, 'Product name and price are required');
    }

    const normalizedCategory = normalizeCategory(category) || 'MILK';
    const productId = generateProductId(normalizedCategory);

    const product = await Product.create({
      productId,
      name: name.trim(),
      category: normalizedCategory,
      description: description ? description.trim() : '',
      unit: unit || 'L',
      price: Number(price),
      farmer: req.user._id,
      location: req.user.city || req.user.district || 'Dindigul',
      emoji: EMOJI_MAP[normalizedCategory] || '🥛',
      fatContent: fatContent || null,
      snfContent: snfContent || null,
      milkingSlot: milkingSlot || null,
      packaging: packaging || 'Eco Glass Bottle',
      isOrganic: isOrganic !== undefined ? Boolean(isOrganic) : true,
      isA2: isA2 !== undefined ? Boolean(isA2) : false,
      status: 'AVAILABLE',
    });

    // Initialize today's daily inventory so the product is immediately orderable
    const today = new Date().toISOString().slice(0, 10);
    await DailyInventory.create({
      product: product._id,
      productId: product.productId,
      farmer: req.user._id,
      date: today,
      availableQuantity: 50,
      soldQuantity: 0,
      remainingQuantity: 50,
      unit: product.unit,
      price: product.price,
      status: 'AVAILABLE',
    });

    return successResponse(res, 201, 'Product created successfully', product);
  } catch (error) {
    console.error('createProduct Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

// ─── PUT /api/products/:id ────────────────────────────────────────────────────
// @desc    Update product (Farmer only — own products only)
// @access  Private (Farmer)
const updateProduct = async (req, res) => {
  try {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
    const product = await Product.findOne({
      $or: [
        ...(isObjectId ? [{ _id: req.params.id }] : []),
        { productId: req.params.id },
      ],
    });

    if (!product) {
      return errorResponse(res, 404, 'Product not found');
    }

    if (product.farmer.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Not authorized to edit this product');
    }

    // Normalize category if provided
    if (req.body.category) {
      req.body.category = normalizeCategory(req.body.category) || product.category;
      req.body.emoji = EMOJI_MAP[req.body.category] || product.emoji;
    }

    const updated = await Product.findByIdAndUpdate(
      product._id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate('farmer', 'name farmName');

    return successResponse(res, 200, 'Product updated successfully', updated);
  } catch (error) {
    console.error('updateProduct Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

// ─── DELETE /api/products/:id ─────────────────────────────────────────────────
// @desc    Delete product (Farmer only — own products only)
// @access  Private (Farmer)
const deleteProduct = async (req, res) => {
  try {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
    const product = await Product.findOne({
      $or: [
        ...(isObjectId ? [{ _id: req.params.id }] : []),
        { productId: req.params.id },
      ],
    });

    if (!product) {
      return errorResponse(res, 404, 'Product not found');
    }

    if (product.farmer.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Not authorized to delete this product');
    }

    await Product.findByIdAndDelete(product._id);
    return successResponse(res, 200, 'Product deleted successfully');
  } catch (error) {
    console.error('deleteProduct Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

module.exports = {
  searchProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
