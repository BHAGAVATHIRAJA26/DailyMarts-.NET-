const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { errorResponse } = require('../utils/responseHandler');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return errorResponse(res, 401, 'User account no longer exists');
      }

      next();
    } catch (error) {
      console.error('JWT Auth Error:', error.message);
      return errorResponse(res, 401, 'Not authorized, token failed or expired');
    }
  }

  if (!token) {
    return errorResponse(res, 401, 'Not authorized, no token provided');
  }
};

// Role authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return errorResponse(
        res,
        403,
        `User role '${req.user?.role}' is not authorized to access this route`
      );
    }
    next();
  };
};

const customerOnly = authorize('CUSTOMER');
const farmerOnly = authorize('FARMER');

module.exports = { protect, authorize, customerOnly, farmerOnly };
