const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  id: { type: Number, unique: true, required: true },   // keeps parity with frontend numeric ids
  name: { type: String, required: true, trim: true },
  brand: { type: String, required: true, trim: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  originalPrice: { type: Number, default: null },
  discount: { type: Number, default: 0 },
  stock: { type: Number, default: 0, min: 0 },
  lowStockThreshold: { type: Number, default: 3 },
  description: { type: String, default: '' },
  images: [{ type: String }],
  featured: { type: Boolean, default: false },
  deal: { type: Boolean, default: false },
  tags: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);
