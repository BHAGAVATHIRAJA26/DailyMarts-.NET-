const DailyInventory = require('../models/DailyInventory');
const Product = require('../models/Product');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// @desc    Get daily inventory for a farmer or product on a date
// @route   GET /api/inventory
// @access  Public / Private
const getDailyInventory = async (req, res) => {
  try {
    const { farmerId, productId, date } = req.query;
    const targetDate = date || new Date().toISOString().slice(0, 10);

    const filter = { date: targetDate };
    if (farmerId) filter.farmer = farmerId;
    if (productId) filter.productId = productId;

    const inventories = await DailyInventory.find(filter)
      .populate('product', 'name category emoji price unit')
      .populate('farmer', 'name farmName location');

    return successResponse(res, 200, `Inventories for ${targetDate}`, inventories);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

// @desc    Update or create daily capacity (Farmer only)
// @route   POST /api/inventory/update
// @route   PATCH /api/products/:id/capacity
// @access  Private (Farmer)
const updateDailyCapacity = async (req, res) => {
  try {
    const { productId, date, availableQuantity } = req.body;
    const targetDate = date || new Date().toISOString().slice(0, 10);

    let product = await Product.findOne({
      $or: [{ _id: req.params.id || null }, { productId: productId || '' }],
    });

    if (!product) {
      return errorResponse(res, 404, 'Product not found');
    }

    if (product.farmer.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Not authorized to update inventory for this product');
    }

    const newAvailable = Number(availableQuantity);
    if (isNaN(newAvailable) || newAvailable < 0) {
      return errorResponse(res, 400, 'Available quantity must be a non-negative number');
    }

    let inventory = await DailyInventory.findOne({
      product: product._id,
      date: targetDate,
    });

    const currentSold = inventory ? inventory.soldQuantity : 0;

    if (newAvailable < currentSold) {
      return errorResponse(
        res,
        400,
        `Cannot reduce capacity below already sold quantity (${currentSold} ${product.unit})`
      );
    }

    const remainingQuantity = newAvailable - currentSold;
    const status = remainingQuantity === 0 ? 'SOLD_OUT' : remainingQuantity < 5 ? 'LIMITED' : 'AVAILABLE';

    inventory = await DailyInventory.findOneAndUpdate(
      { product: product._id, farmer: req.user._id, date: targetDate },
      {
        product: product._id,
        productId: product.productId,
        farmer: req.user._id,
        date: targetDate,
        availableQuantity: newAvailable,
        soldQuantity: currentSold,
        remainingQuantity,
        unit: product.unit,
        price: product.price,
        status,
      },
      { upsert: true, new: true, runValidators: true }
    );

    // Also update main Product status
    await Product.findByIdAndUpdate(product._id, { status });

    return successResponse(res, 200, "Daily capacity updated successfully", inventory);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

module.exports = { getDailyInventory, updateDailyCapacity };
