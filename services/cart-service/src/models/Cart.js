/**
 * Cart Model
 * 
 * Mongoose schema for the Cart entity.
 * Each user has one cart containing an array of cart items.
 * 
 * Fields:
 *   - userId:    Reference to the user who owns this cart
 *   - items:     Array of cart items with product references
 *   - totalAmount: Computed total price of all items
 */

const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Product ID is required'],
      ref: 'Product'
    },
    productName: {
      type: String,
      required: [true, 'Product name is required']
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative']
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1
    }
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'User ID is required'],
      unique: true, // One cart per user
      index: true
    },
    items: [cartItemSchema],
    totalAmount: {
      type: Number,
      default: 0,
      min: 0
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
 * Pre-save hook: Recalculate total amount whenever items change.
 */
cartSchema.pre('save', function (next) {
  this.totalAmount = this.items.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);
  // Round to 2 decimal places to avoid floating point issues
  this.totalAmount = Math.round(this.totalAmount * 100) / 100;
  next();
});

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
