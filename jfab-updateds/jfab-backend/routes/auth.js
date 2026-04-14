const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendEmail, templates } = require('../utils/email');

// Helper: create and send JWT token
function sendToken(user, statusCode, res) {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  });

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      points: user.points,
      addresses: user.addresses,
      createdAt: user.createdAt
    }
  });
}

// ─── POST /api/auth/register ──────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }

    const user = await User.create({ name, email, phone, password });

    // Send welcome email (non-blocking)
    sendEmail({
      to: user.email,
      subject: '🌹 Welcome to J-Fab Perfumes!',
      html: templates.welcomeHtml(user.name)
    });

    sendToken(user, 201, res);
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Select password explicitly (it's hidden by default)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    sendToken(user, 200, res);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// ─── POST /api/auth/admin-login — admin dashboard login ──────────────────
// Returns a JWT with admin role so the admin panel can call protected routes
router.post('/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const user = await User.findOne({ email: email.toLowerCase(), role: 'admin' }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }

    sendToken(user, 200, res);
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /api/auth/me — get current user profile ─────────────────────────
router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, user });
});

// ─── PUT /api/auth/profile — update profile ───────────────────────────────
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone, addresses } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, addresses },
      { new: true, runValidators: true }
    );
    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

// ─── PUT /api/auth/change-password ───────────────────────────────────────
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both fields are required' });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
// Accepts an email, generates a reset token, and sends a reset link
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success to prevent email enumeration attacks
    if (!user) {
      return res.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
    }

    const rawToken = user.generateResetToken();
    await user.save({ validateBeforeSave: false });

    // Build reset URL — use FRONTEND_URL env var or fall back to the request origin
    const frontendBase = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
    const resetUrl = `${frontendBase}/reset-password.html?token=${rawToken}`;

    await sendEmail({
      to: user.email,
      subject: '🔐 Reset your J-Fab Perfumes password',
      html: templates.passwordResetHtml(user.name, resetUrl)
    });

    res.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ─── POST /api/auth/reset-password/:token ────────────────────────────────────
// Validates the token and sets a new password
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Hash the incoming token to compare with the stored hash
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Reset link is invalid or has expired. Please request a new one.' });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully! You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

module.exports = router;
