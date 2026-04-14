const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [60, 'Name cannot exceed 60 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false   // never returned in queries by default
  },
  role: {
    type: String,
    enum: ['customer', 'admin'],
    default: 'customer'
  },
  points: {
    type: Number,
    default: 0
  },
  addresses: [
    {
      label: String,   // e.g. "Home", "Office"
      address: String,
      zone: { type: String, enum: ['island', 'mainland', 'outside'] }
    }
  ],
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate and store a password reset token (expires in 1 hour)
userSchema.methods.generateResetToken = function () {
  const crypto = require('crypto');
  const rawToken = crypto.randomBytes(32).toString('hex');
  // Store hashed version in DB for security
  this.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  this.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
  return rawToken; // send the plain token in the email link
};

module.exports = mongoose.model('User', userSchema);
