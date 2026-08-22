const successResponse = (res, statusCode = 200, message = 'Success', data = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const errorResponse = (res, statusCode = 400, message = 'Error', errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};

module.exports = { successResponse, errorResponse };
