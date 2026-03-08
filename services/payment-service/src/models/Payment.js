/**
 * Payment Model
 * 
 * Mongoose schema for the Payment entity.
 * Tracks payment transactions linked to orders.
 * 
 * Fields:
 *   - orderId:        Reference to the associated order
 *   - userId:         Reference to the user who made the payment
 *   - amount:         Payment amount in USD
 *   - currency:       ISO 4217 currency code (default: USD)
 *   - method:         Payment method used
 *   - status:         Payment lifecycle status
 *   - transactionId:  Unique payment gateway transaction identifier
 *   - gatewayResponse: Raw response from payment gateway (for debugging)
 */

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Order ID is required'],
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'User ID is required'],
      index: true
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be at least 0.01']
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3
    },
    method: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'upi', 'crypto'],
      default: 'credit_card'
    },
    status: {
      type: String,
      enum: ['initiated', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
      default: 'initiated'
    },
    transactionId: {
      type: String,
      unique: true
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed, // Store raw gateway response for debugging
      default: null
    },
    failureReason: {
      type: String,
      default: null
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    metadata: {
      ipAddress: { type: String },
      userAgent: { type: String }
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        delete ret.gatewayResponse; // Don't expose raw gateway data to clients
        return ret;
      }
    }
  }
);

// Indexes for common queries
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
