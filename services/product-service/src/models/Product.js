/**
 * Product Model
 * 
 * Mongoose schema for the Product entity.
 * Represents items available for sale in the eCommerce catalog.
 * 
 * Fields:
 *   - name:        Product name (required, indexed for search)
 *   - description: Detailed product description
 *   - price:       Price in USD (required, must be >= 0)
 *   - category:    Product category for filtering
 *   - brand:       Manufacturer or brand name
 *   - stock:       Available quantity (default: 0)
 *   - images:      Array of image URLs
 *   - ratings:     Embedded rating statistics
 *   - isActive:    Soft delete / visibility flag
 */

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [200, 'Product name must not exceed 200 characters']
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      maxlength: [2000, 'Description must not exceed 2000 characters']
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative']
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'electronics',
        'clothing',
        'books',
        'home',
        'sports',
        'beauty',
        'toys',
        'food',
        'other'
      ]
    },
    brand: {
      type: String,
      trim: true
    },
    stock: {
      type: Number,
      required: true,
      min: [0, 'Stock cannot be negative'],
      default: 0
    },
    images: [
      {
        url: { type: String, required: true },
        alt: { type: String, default: '' }
      }
    ],
    ratings: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 }
    },
    sku: {
      type: String,
      unique: true,
      sparse: true, // Allows null values while maintaining uniqueness
      trim: true
    },
    tags: [{ type: String, trim: true }],
    isActive: {
      type: Boolean,
      default: true
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

// Indexes for common queries
productSchema.index({ name: 'text', description: 'text' }); // Full-text search
productSchema.index({ category: 1, price: 1 });               // Category + price filter
productSchema.index({ isActive: 1 });                         // Active products filter

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
