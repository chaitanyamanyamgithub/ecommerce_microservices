/**
 * Order Model
 * 
 * Mongoose schema for the Order entity.
 * Represents a completed purchase containing items,
 * shipping details, and order lifecycle status.
 * 
 * Fields:
 *   - userId:          Reference to the purchasing user
 *   - items:           Array of ordered products with quantities
 *   - totalAmount:     Total order value in USD
 *   - status:          Order lifecycle status
 *   - shippingAddress: Delivery address
 *   - paymentStatus:   Payment state (pending/completed/failed/refunded)
 *   - orderNumber:     Human-readable unique order identifier
 */

const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Product ID is required']
    },
    productName: {
      type: String,
      required: [true, 'Product name is required']
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: 1
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'User ID is required'],
      index: true
    },
    orderNumber: {
      type: String,
      unique: true
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (items) => items.length > 0,
        message: 'Order must contain at least one item'
      }
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative']
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending'
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    shippingAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, required: true }
    },
    notes: {
      type: String,
      maxlength: 500
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      }
    }
  }
);

/**
 * Pre-save hook: Generate a unique order number.
 * Format: ORD-YYYYMMDD-XXXXX (e.g., ORD-20240715-A3B2C)
 */
orderSchema.pre('save', function (next) {
  if (!this.orderNumber) {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.orderNumber = `ORD-${date}-${random}`;
  }
  next();
});

// Indexes for common queries
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
