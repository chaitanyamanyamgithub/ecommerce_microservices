/**
 * Product Service - Route Definitions
 * 
 * Routes:
 *   GET    /products      - List all products (with filters)
 *   GET    /products/:id  - Get single product
 *   POST   /products      - Create a product
 *   DELETE /products/:id  - Soft-delete a product
 */

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { validateProductData } = require('../middleware/validation');

router.get('/products', productController.getAllProducts);

// Internal endpoints for inter-service communication
router.post('/products/check-stock', productController.checkStock);
router.post('/products/decrement-stock', productController.decrementStock);

router.get('/products/:id', productController.getProductById);
router.post('/products', validateProductData, productController.createProduct);
router.delete('/products/:id', productController.deleteProduct);

module.exports = router;
