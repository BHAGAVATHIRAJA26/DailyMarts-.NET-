const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dailymarts_jwt_secret_key_2026_secure';

const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
};

module.exports = generateToken;
