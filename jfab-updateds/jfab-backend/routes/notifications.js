const express      = require('express');
const router       = express.Router();
const Notification = require('../models/Notifications');
const { protect, adminOnly } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');

// ── POST /api/notifications/newsletter — public subscribe ────────────────────
router.post('/newsletter', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    // Upsert — silently succeed if already exists
    await Notification.findOneAndUpdate(
      { type: 'newsletter', email: email.toLowerCase() },
      { type: 'newsletter', email: email.toLowerCase() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Welcome email (non-blocking)
    sendEmail({
      to: email,
      subject: '🌹 You\'re subscribed to J-Fab Perfumes!',
      html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:32px">
        <h2 style="color:#1a1a1a">Welcome to J-Fab! 🌹</h2>
        <p>You're now subscribed to our newsletter. You'll be the first to know about new arrivals, exclusive deals, and insider fragrance tips.</p>
        <p style="margin-top:24px">Visit us at <a href="https://j-fab.vercel.app" style="color:#C9A84C">j-fab.vercel.app</a></p>
        <p style="color:#888;font-size:0.85rem;margin-top:32px">— J-Fab Perfumes Team</p>
      </div>`
    });

    res.json({ success: true, message: 'Subscribed successfully!' });
  } catch (err) {
    if (err.code === 11000) {
      return res.json({ success: true, message: 'You are already subscribed!' });
    }
    res.status(500).json({ success: false, message: 'Could not subscribe. Try again.' });
  }
});

// ── POST /api/notifications/stock-alert — public notify-me signup ────────────
router.post('/stock-alert', async (req, res) => {
  try {
    const { email, name, phone, productId, productName } = req.body;
    if (!email || !productId) {
      return res.status(400).json({ success: false, message: 'Email and product ID are required' });
    }

    await Notification.findOneAndUpdate(
      { type: 'stock_alert', email: email.toLowerCase(), productId },
      { type: 'stock_alert', email: email.toLowerCase(), name: name || '', phone: phone || '', productId, productName: productName || '', notified: false },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Confirm email to customer
    sendEmail({
      to: email,
      subject: `🔔 Stock Alert Set — ${productName || 'Product'} | J-Fab Perfumes`,
      html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:32px">
        <h2 style="color:#1a1a1a">Alert Set! 🔔</h2>
        <p>Hi${name ? ' ' + name : ''},</p>
        <p>We'll email you the moment <strong>${productName || 'this product'}</strong> is back in stock at J-Fab Perfumes.</p>
        <p style="margin-top:24px">In the meantime, browse our available fragrances at <a href="https://j-fab.vercel.app" style="color:#C9A84C">j-fab.vercel.app</a></p>
        <p style="color:#888;font-size:0.85rem;margin-top:32px">— J-Fab Perfumes Team</p>
      </div>`
    });

    res.json({ success: true, message: "You'll be notified when it's back!" });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not save your request. Try again.' });
  }
});

// ── GET /api/notifications — Admin: list all ─────────────────────────────────
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { type } = req.query;
    const filter = type ? { type } : {};
    const items = await Notification.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, notifications: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE /api/notifications/:id — Admin: remove subscriber ─────────────────
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
