const mongoose = require('mongoose');

const perfumeRequestSchema = new mongoose.Schema({
  ref: { type: String, unique: true, required: true },
  perfumeName: { type: String, required: true },
  yourName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  details: String,
  imageUrl: String,       // path if user uploaded an image
  status: {
    type: String,
    enum: ['pending', 'available', 'notified', 'cancelled'],
    default: 'pending'
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PerfumeRequest', perfumeRequestSchema);
