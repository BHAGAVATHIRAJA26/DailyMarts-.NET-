const ProductExchange = require('../models/ProductExchange');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// ─── Helper: race-condition-safe Exchange ID ───────────────────────────────
const generateExchangeId = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(100 + Math.random() * 900);
  return `EX-${new Date().getFullYear()}-${ts}-${rand}`;
};

// @desc    Find nearby farmers within radius (GeoJSON 2dsphere)
// @route   GET /api/farmers/nearby
// @access  Public / Private
const getNearbyFarmers = async (req, res) => {
  try {
    const { longitude, latitude, radiusInKm } = req.query;

    const lng = Number(longitude) || 77.9803; // Default Dindigul
    const lat = Number(latitude) || 10.3673;
    const maxDistanceMeters = (Number(radiusInKm) || 15) * 1000; // default 15km

    const nearbyFarmers = await User.find({
      role: 'FARMER',
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: maxDistanceMeters,
        },
      },
    }).select('name farmName location address city phone rating categories');

    return successResponse(res, 200, `Found ${nearbyFarmers.length} nearby farmers within ${radiusInKm || 15}km`, nearbyFarmers);
  } catch (error) {
    console.error('getNearbyFarmers Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

// @desc    Get all product exchange/transfer requests
// @route   GET /api/exchanges
// @access  Private (Farmer)
const getExchangeRequests = async (req, res) => {
  try {
    const exchanges = await ProductExchange.find()
      .populate('senderFarmer', 'name farmName location phone rating')
      .populate('receiverFarmer', 'name farmName location phone')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, `Found ${exchanges.length} exchange requests`, exchanges);
  } catch (error) {
    console.error('getExchangeRequests Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

// @desc    Raise new product exchange/transfer request (Farmer only)
// @route   POST /api/exchanges
// @access  Private (Farmer)
const createExchangeRequest = async (req, res) => {
  try {
    const { exchangeType, requestedProduct, requiredQuantity, unit, offeredProduct, pricePerUnit, offeredAmount, notes } = req.body;

    const exchangeId = generateExchangeId();
    const mode = exchangeType ? exchangeType.toUpperCase() : 'SWAP';
    const qty = Number(requiredQuantity) || 1;

    const exchange = await ProductExchange.create({
      exchangeId,
      senderFarmer: req.user._id,
      exchangeType: mode,
      requestedProduct,
      requiredQuantity: qty,
      unit: unit || 'L',
      offeredProduct: mode === 'SWAP' ? offeredProduct : null,
      pricePerUnit: mode === 'PAID' ? (pricePerUnit || Math.round((offeredAmount || 0) / qty)) : null,
      offeredAmount: mode === 'PAID' ? offeredAmount : null,
      location: req.user.city || 'Dindigul',
      notes,
      status: 'PENDING',
    });

    return successResponse(res, 201, 'Product exchange request published successfully', exchange);
  } catch (error) {
    console.error('createExchangeRequest Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

// @desc    Accept farmer exchange request (Receiver Farmer only)
// @route   PATCH /api/exchanges/:id/accept
// @access  Private (Farmer)
const acceptExchangeRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);

    const exchange = await ProductExchange.findOne({
      $or: [
        ...(isObjectId ? [{ _id: id }] : []),
        { exchangeId: id },
      ],
    });

    if (!exchange) {
      return errorResponse(res, 404, 'Exchange request not found');
    }

    if (exchange.senderFarmer.toString() === req.user._id.toString()) {
      return errorResponse(res, 400, 'Cannot accept your own exchange request');
    }

    exchange.receiverFarmer = req.user._id;
    exchange.status = 'ACCEPTED';
    await exchange.save();

    // Notify Sender Farmer
    await Notification.create({
      recipient: exchange.senderFarmer,
      sender: req.user._id,
      type: 'EXCHANGE_ACCEPTED',
      title: '🤝 Exchange Request Accepted',
      message: `Farmer ${req.user.name} accepted your ${exchange.requestedProduct} request!`,
      icon: '🤝',
      relatedEntityId: exchange.exchangeId,
    });

    return successResponse(res, 200, 'Exchange request accepted successfully', exchange);
  } catch (error) {
    console.error('acceptExchangeRequest Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

module.exports = {
  getNearbyFarmers,
  getExchangeRequests,
  createExchangeRequest,
  acceptExchangeRequest,
};
