const mongoose = require('mongoose');

// Single-document store for site-wide config.
// We use a fixed `key` field so there's always exactly one doc per key.
const SiteConfigSchema = new mongoose.Schema({
  key:   { type: String, required: true, unique: true }, // e.g. 'announcement', 'flash_sale'
  value: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true });

module.exports = mongoose.model('SiteConfig', SiteConfigSchema);
