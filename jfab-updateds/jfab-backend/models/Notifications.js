const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['newsletter', 'stock_alert'],
    required: true
  },
  email: { type: String, required: true, lowercase: true, trim: true },
  name:  { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  // For stock_alert only
  productId:   { type: Number, default: null },
  productName: { type: String, default: '' },
  notified:    { type: Boolean, default: false },
  notifiedAt:  { type: Date, default: null }
}, { timestamps: true });

// Prevent duplicate newsletter subscriptions
NotificationSchema.index({ type: 1, email: 1 }, { unique: true, partialFilterExpression: { type: 'newsletter' } });

module.exports = mongoose.model('Notification', NotificationSchema);
