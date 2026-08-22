const express = require('express');
const router = express.Router();
const {
  searchProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { updateDailyCapacity } = require('../controllers/inventoryController');
const { protect, farmerOnly } = require('../middleware/authMiddleware');

router.get('/', searchProducts);
router.get('/search', searchProducts);
router.get('/:id', getProductById);

router.post('/', protect, farmerOnly, createProduct);
router.put('/:id', protect, farmerOnly, updateProduct);
router.delete('/:id', protect, farmerOnly, deleteProduct);
router.patch('/:id/capacity', protect, farmerOnly, updateDailyCapacity);

module.exports = router;
