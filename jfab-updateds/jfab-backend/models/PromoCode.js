const mongoose = require('mongoose');

const PromoCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: { type: String, enum: ['percent', 'fixed', 'shipping'], required: true },
  value: { type: Number, required: true },
  description: { type: String, default: '' },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('PromoCode', PromoCodeSchema);
