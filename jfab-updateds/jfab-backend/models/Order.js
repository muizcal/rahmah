const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productRef: String,       // fallback product id string (e.g. from frontend data.js)
  name: { type: String, required: true },
  brand: String,
  price: { type: Number, required: true },
  qty: { type: Number, required: true, min: 1 },
  image: String
});

const orderSchema = new mongoose.Schema({
  ref: {
    type: String,
    unique: true,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null   // null = guest order
  },
  // Customer details (filled for both guest and logged-in)
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  customerPhone: { type: String, required: true },

  items: [orderItemSchema],

  subtotal: { type: Number, required: true },
  deliveryCost: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },

  deliveryType: {
    type: String,
    enum: ['delivery', 'pickup'],
    required: true
  },
  deliveryZone: {
    type: String,
    enum: ['island', 'mainland', 'outside', ''],
    default: ''
  },
  deliveryAddress: String,

  promoUsed: String,

  paymentRef: String,
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentVerified: {
    type: Boolean,
    default: false
  },

  status: {
    type: String,
    enum: ['pending', 'processing', 'dispatched', 'delivered', 'cancelled'],
    default: 'pending'
  },

  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

orderSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Order', orderSchema);
