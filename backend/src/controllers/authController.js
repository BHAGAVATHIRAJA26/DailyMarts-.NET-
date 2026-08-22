const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { sendWelcomeEmail } = require('../services/emailService');

// @desc    Register a new user (CUSTOMER or FARMER)
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
  const {
      name, email, phone, password, role, farmName,
      categories, address, city, district, state, pincode, coordinates, upiId
    } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return errorResponse(res, 400, 'User with this email already exists');
    }

    const formattedRole = role ? role.toUpperCase() : 'CUSTOMER';
    if (!['CUSTOMER', 'FARMER'].includes(formattedRole)) {
      return errorResponse(res, 400, 'Role must be CUSTOMER or FARMER');
    }

    const locationObj = {
      type: 'Point',
      coordinates: Array.isArray(coordinates) && coordinates.length === 2 ? coordinates : [77.9803, 10.3673], // [lng, lat]
    };

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: formattedRole,
      farmName: formattedRole === 'FARMER' ? farmName || `${name}'s Farm` : null,
      upiId: formattedRole === 'FARMER' ? (upiId || null) : null,
      categories: Array.isArray(categories) ? categories : ['MILK', 'MILK_PRODUCT'],
      address: address || 'Main Road',
      city: city || 'Dindigul',
      district: district || 'Dindigul',
      state: state || 'Tamil Nadu',
      pincode: pincode || '624001',
      location: locationObj,
    });

    const token = generateToken(user._id);

    // Send Welcome Email asynchronously
    sendWelcomeEmail(user).catch((err) => console.error('Welcome email error:', err.message));

    return successResponse(res, 201, 'User registered successfully', {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      farmName: user.farmName,
      upiId: user.upiId,
      location: user.city,
      token,
    });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return errorResponse(res, 400, 'Please provide email and password');
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return errorResponse(res, 401, 'Invalid email or password');
    }

    if (role && user.role !== role.toUpperCase()) {
      return errorResponse(res, 403, `Account exists as ${user.role}, not ${role.toUpperCase()}`);
    }

    const token = generateToken(user._id);

    return successResponse(res, 200, 'Logged in successfully', {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      farmName: user.farmName,
      location: user.city,
      address: user.address,
      token,
    });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    return successResponse(res, 200, 'User profile fetched', user);
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile or /api/auth/me
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    const { name, phone, address, city, district, state, pincode, farmName, upiId, categories, dairyCowsCount, dailyYieldEstimate } = req.body;

    if (name) user.name = name.trim();
    if (phone) user.phone = phone.trim();
    if (address) user.address = address.trim();
    if (city) user.city = city.trim();
    if (district) user.district = district.trim();
    if (state) user.state = state.trim();
    if (pincode) user.pincode = pincode.trim();
    if (farmName && user.role === 'FARMER') user.farmName = farmName.trim();
    if (upiId !== undefined && user.role === 'FARMER') user.upiId = upiId ? upiId.trim() : null;
    if (categories && user.role === 'FARMER') user.categories = Array.isArray(categories) ? categories : user.categories;
    if (dairyCowsCount !== undefined && user.role === 'FARMER') user.dairyCowsCount = Number(dairyCowsCount);
    if (dailyYieldEstimate !== undefined && user.role === 'FARMER') user.dailyYieldEstimate = dailyYieldEstimate;

    const updatedUser = await user.save();

    return successResponse(res, 200, 'Profile updated successfully', {
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      farmName: updatedUser.farmName,
      upiId: updatedUser.upiId,
      address: updatedUser.address,
      city: updatedUser.city,
      district: updatedUser.district,
      state: updatedUser.state,
      pincode: updatedUser.pincode,
      categories: updatedUser.categories,
      dairyCowsCount: updatedUser.dairyCowsCount,
      dailyYieldEstimate: updatedUser.dailyYieldEstimate,
    });
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

module.exports = { registerUser, loginUser, getMe, updateProfile };
