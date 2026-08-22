const Product = require('../models/Product');
const DailyInventory = require('../models/DailyInventory');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// @desc    Get all products or search by query
// @route   GET /api/products
// @route   GET /api/products/search
// @access  Public
const searchProducts = async (req, res) => {
  try {
    const { name, productId, category, location, farmerId, availability } = req.query;

    const filter = {};

    if (name) {
      filter.name = { $regex: name, $options: 'i' };
    }

    if (productId) {
      filter.productId = { $regex: productId, $options: 'i' };
    }

    if (category) {
      filter.category = category.toUpperCase();
    }

    if (location && location !== 'All Locations') {
      filter.location = { $regex: location, $options: 'i' };
    }

    if (farmerId) {
      filter.farmer = farmerId;
    }

    if (availability === 'available') {
      filter.status = 'AVAILABLE';
    }

    const products = await Product.find(filter).populate('farmer', 'name farmName location phone rating');

    return successResponse(res, 200, `Found ${products.length} products`, products);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

// @desc    Get single product by ID or ProductId
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    let product = await Product.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { productId: id }],
    }).populate('farmer', 'name farmName location phone rating address');

    if (!product) {
      return errorResponse(res, 404, 'Product not found');
    }

    return successResponse(res, 200, 'Product details fetched', product);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

// @desc    Create new product (Farmer only)
// @route   POST /api/products
// @access  Private (Farmer)
const createProduct = async (req, res) => {
  try {
    const { name, category, description, unit, price, fatContent, snfContent, packaging, isOrganic, isA2 } = req.body;

    const count = await Product.countDocuments();
    const prefix = category ? category.slice(0, 3).toUpperCase() : 'PRD';
    const productId = `DM-${prefix}-${10001 + count}`;

    const emojiMap = {
      MILK: '🥛',
      MILK_PRODUCT: '🧈',
      VEGETABLE: '🥬',
      CHICKEN: '🐔',
      MEAT: '🥩',
      OTHER: '🌾',
    };

    const product = await Product.create({
      productId,
      name,
      category: category ? category.toUpperCase() : 'MILK',
      description,
      unit: unit || 'L',
      price,
      farmer: req.user._id,
      location: req.user.city || 'Dindigul',
      emoji: emojiMap[category?.toUpperCase()] || '🥛',
      fatContent,
      snfContent,
      packaging,
      isOrganic: isOrganic !== undefined ? isOrganic : true,
      isA2: isA2 !== undefined ? isA2 : false,
      status: 'AVAILABLE',
    });

    // Also initialize today's daily inventory
    const today = new Date().toISOString().slice(0, 10);
    await DailyInventory.create({
      product: product._id,
      productId: product.productId,
      farmer: req.user._id,
      date: today,
      availableQuantity: 30,
      soldQuantity: 0,
      remainingQuantity: 30,
      unit: product.unit,
      price: product.price,
      status: 'AVAILABLE',
    });

    return successResponse(res, 201, 'Product created successfully', product);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

// @desc    Update product (Farmer only)
// @route   PUT /api/products/:id
// @access  Private (Farmer)
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return errorResponse(res, 404, 'Product not found');
    }

    if (product.farmer.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Not authorized to edit this product');
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    return successResponse(res, 200, 'Product updated successfully', updated);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

// @desc    Delete product (Farmer only)
// @route   DELETE /api/products/:id
// @access  Private (Farmer)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return errorResponse(res, 404, 'Product not found');
    }

    if (product.farmer.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Not authorized to delete this product');
    }

    await Product.findByIdAndDelete(req.params.id);
    return successResponse(res, 200, 'Product deleted successfully');
  } catch (error) {
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
