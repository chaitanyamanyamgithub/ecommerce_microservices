/**
 * Order Service Layer
 *
 * Orchestrates the full order workflow:
 * 1. Check product stock (product-service)
 * 2. Create the order
 * 3. Process payment (payment-service)
 * 4. Decrement stock (product-service)
 * 5. Clear the user's cart (cart-service)
 */

const axios = require('axios');
const Order = require('../models/Order');
const config = require('../config');
const { AppError } = require('@shared/utils');

const { productService, cartService, paymentService } = config.services;

/**
 * Create a new order with full orchestration.
 *
 * Flow:
 *   1. Verify stock availability via product-service
 *   2. Persist the order with status 'pending'
 *   3. Call payment-service to process payment
 *   4. On payment success: confirm order, decrement stock, clear cart
 *   5. On payment failure: mark order as failed
 *
 * @param {object} orderData - { userId, items, shippingAddress, paymentMethod, notes }
 * @returns {Promise<object>} Created order with payment info
 */
const createOrder = async (orderData) => {
  const { items, userId, paymentMethod = 'credit_card' } = orderData;

  // ── Step 1: Check stock ────────────────────────────────────
  try {
    const stockRes = await axios.post(`${productService}/api/products/check-stock`, { items });
    const stockData = stockRes.data.data;

    if (!stockData.available) {
      throw new AppError(
        `Insufficient stock for: ${stockData.insufficientItems.map(i => i.productName || i.productId).join(', ')}`,
        400
      );
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Product service unavailable: ${error.message}`, 503);
  }

  // ── Step 2: Calculate total and create order ───────────────
  const totalAmount = Math.round(
    items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100
  ) / 100;

  orderData.totalAmount = totalAmount;
  const order = await Order.create(orderData);

  // ── Step 3: Process payment ────────────────────────────────
  try {
    const paymentRes = await axios.post(`${paymentService}/api/payment`, {
      orderId: order._id,
      userId,
      amount: totalAmount,
      method: paymentMethod
    });

    const paymentData = paymentRes.data.data;

    if (paymentData.status === 'completed') {
      order.paymentStatus = 'completed';
      order.status = 'confirmed';
      await order.save();

      // ── Step 4: Decrement stock (best-effort) ──────────────
      try {
        await axios.post(`${productService}/api/products/decrement-stock`, { items });
      } catch (err) {
        // Log but don't fail the order — stock can be reconciled later
      }

      // ── Step 5: Clear cart (best-effort) ────────────────────
      try {
        await axios.delete(`${cartService}/api/cart/clear/${userId}`);
      } catch (err) {
        // Log but don't fail the order
      }
    } else {
      order.paymentStatus = 'failed';
      order.status = 'cancelled';
      await order.save();
    }
  } catch (error) {
    // Payment service call failed entirely
    order.paymentStatus = 'failed';
    order.status = 'cancelled';
    await order.save();

    if (error.response && error.response.status === 402) {
      throw new AppError('Payment was declined', 402);
    }
    throw new AppError(`Payment service unavailable: ${error.message}`, 503);
  }

  return order;
};

/**
 * Get all orders for a specific user.
 */
const getOrdersByUserId = async (userId) => {
  const orders = await Order.find({ userId })
    .sort({ createdAt: -1 });

  return {
    orders,
    totalOrders: orders.length
  };
};

/**
 * Get a single order by its ID.
 */
const getOrderById = async (orderId) => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  return order;
};

module.exports = {
  createOrder,
  getOrdersByUserId,
  getOrderById
};
