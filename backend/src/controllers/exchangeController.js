const ProductExchange = require('../models/ProductExchange');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// ─── Helper: unique exchange ID — race condition safe ─────────────────────────
const generateExchangeId = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(100 + Math.random() * 900);
  return `EX-${new Date().getFullYear()}-${ts}-${rand}`;
};

// ─── GET /api/farmers/nearby ──────────────────────────────────────────────────
// @desc    Find nearby farmers within radius (GeoJSON 2dsphere)
// @access  Public / Private
const getNearbyFarmers = async (req, res) => {
  try {
    const { longitude, latitude, radiusInKm } = req.query;

    const lng = Number(longitude) || 77.9803; // Default Dindigul
    const lat = Number(latitude) || 10.3673;
    const maxDistanceMeters = (Number(radiusInKm) || 15) * 1000;

    const nearbyFarmers = await User.find({
      role: 'FARMER',
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: maxDistanceMeters,
        },
      },
    }).select('name farmName location address city phone rating categories upiId');

    return successResponse(res, 200, `Found ${nearbyFarmers.length} nearby farmers within ${radiusInKm || 15}km`, nearbyFarmers);
  } catch (error) {
    console.error('getNearbyFarmers Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

// ─── GET /api/exchanges ───────────────────────────────────────────────────────
// @desc    Get all product exchange/transfer requests
// @access  Private (Farmer)
const getExchangeRequests = async (req, res) => {
  try {
    const { status, type } = req.query;
    const filter = {};

    if (status) filter.status = status.toUpperCase();
    if (type) filter.exchangeType = type.toUpperCase();

    const exchanges = await ProductExchange.find(filter)
      .populate('senderFarmer', 'name farmName location phone rating city')
      .populate('receiverFarmer', 'name farmName location phone city')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, `Found ${exchanges.length} exchange requests`, exchanges);
  } catch (error) {
    console.error('getExchangeRequests Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

// ─── POST /api/exchanges ──────────────────────────────────────────────────────
// @desc    Raise new product exchange/transfer request (Farmer only)
// @access  Private (Farmer)
const createExchangeRequest = async (req, res) => {
  try {
    const {
      exchangeType, type, requestedProduct, product,
      requiredQuantity, quantity, unit, offeredProduct,
      pricePerUnit, offeredAmount, notes,
    } = req.body;

    const reqProd = requestedProduct || product;
    if (!reqProd) {
      return errorResponse(res, 400, 'Requested product is required');
    }

    const mode = (exchangeType || type || 'SWAP').toUpperCase();
    const qty = Number(requiredQuantity || quantity) || 1;
    const exchangeId = generateExchangeId();

    const exchange = await ProductExchange.create({
      exchangeId,
      senderFarmer: req.user._id,
      exchangeType: mode,
      requestedProduct: reqProd,
      requiredQuantity: qty,
      unit: unit || 'L',
      offeredProduct: mode === 'SWAP' ? (offeredProduct || null) : null,
      pricePerUnit: mode === 'PAID' ? (pricePerUnit || (offeredAmount ? Math.round(offeredAmount / qty) : 60)) : null,
      offeredAmount: mode === 'PAID' ? (offeredAmount || (pricePerUnit ? pricePerUnit * qty : 60 * qty)) : null,
      location: req.user.city || req.user.district || 'Dindigul',
      notes: notes || null,
      status: 'PENDING',
    });

    return successResponse(res, 201, 'Product exchange request published successfully', exchange);
  } catch (error) {
    console.error('createExchangeRequest Error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

// ─── PATCH /api/exchanges/:id/accept ──────────────────────────────────────────
// @desc    Accept farmer exchange request (Receiver Farmer only)
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

    if (exchange.status === 'ACCEPTED') {
      return errorResponse(res, 400, 'Exchange request is already accepted');
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
