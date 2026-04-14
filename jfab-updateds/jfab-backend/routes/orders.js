const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { protect, optionalAuth, adminOnly } = require('../middleware/auth');
const { sendEmail, templates } = require('../utils/email');
const { v4: uuidv4 } = require('uuid');
const https = require('https');

// ─── POST /api/orders — place a new order ─────────────────────────────────
router.post('/', optionalAuth, async (req, res) => {
  try {
    const {
      customerName, customerEmail, customerPhone,
      items, subtotal, deliveryCost, discount, total,
      deliveryType, deliveryZone, deliveryAddress,
      promoUsed, paymentRef
    } = req.body;

    // Basic validation
    if (!customerName || !customerEmail || !customerPhone || !items?.length) {
      return res.status(400).json({ success: false, message: 'Missing required order fields' });
    }

    const ref = 'JFAB-' + Date.now() + '-' + uuidv4().slice(0, 6).toUpperCase();

    const order = await Order.create({
      ref,
      user: req.user?._id || null,
      customerName, customerEmail, customerPhone,
      items,
      subtotal: subtotal || total,
      deliveryCost: deliveryCost || 0,
      discount: discount || 0,
      total,
      deliveryType,
      deliveryZone: deliveryZone || '',
      deliveryAddress: deliveryAddress || '',
      promoUsed: promoUsed || null,
      paymentRef: paymentRef || null,
      paymentStatus: paymentRef ? 'paid' : 'pending',
      status: 'pending'
    });

    // Award loyalty points to logged-in user
    if (req.user) {
      const User = require('../models/User');
      await User.findByIdAndUpdate(req.user._id, { $inc: { points: 1 } });
    }

    // Send beautiful confirmation email to customer
    sendEmail({
      to: customerEmail,
      subject: `✅ Order Confirmed — ${ref} | J-Fab Perfumes`,
      html: templates.orderConfirmationHtml(order)
    });

    // Notify store owner via email
    sendEmail({
      to: process.env.STORE_EMAIL,
      subject: `🛒 New Order ${ref} — ₦${total.toLocaleString()}`,
      html: templates.orderConfirmationHtml(order)
    });

    res.status(201).json({ success: true, order });
  } catch (err) {
    console.error('Order error:', err);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
});

// ─── GET /api/orders/my — current user's orders ───────────────────────────
router.get('/my', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

// ─── GET /api/orders/:ref — get single order by reference ─────────────────
router.get('/:ref', optionalAuth, async (req, res) => {
  try {
    const order = await Order.findOne({ ref: req.params.ref });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Allow access if order owner or admin
    if (req.user?._id?.toString() !== order.user?.toString() && req.user?.role !== 'admin') {
      // Allow guest access if email matches
      const { email } = req.query;
      if (!email || email.toLowerCase() !== order.customerEmail.toLowerCase()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch order' });
  }
});

// ─── GET /api/orders — Admin: all orders ──────────────────────────────────
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { status } : {};
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('user', 'name email phone');
    const total = await Order.countDocuments(filter);
    res.json({ success: true, orders, total, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

// ─── PUT /api/orders/:id/status — Admin: update order status ──────────────
router.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update order' });
  }
});

// ─── POST /api/orders/verify-payment — Paystack server-side verification ──
router.post('/verify-payment', async (req, res) => {
  try {
    const { reference, orderId } = req.body;
    if (!reference) return res.status(400).json({ success: false, message: 'Payment reference required' });

    // Verify with Paystack
    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: `/transaction/verify/${reference}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
    };

    const result = await new Promise((resolve, reject) => {
      const paystackReq = https.request(options, (paystackRes) => {
        let data = '';
        paystackRes.on('data', chunk => data += chunk);
        paystackRes.on('end', () => resolve(JSON.parse(data)));
      });
      paystackReq.on('error', reject);
      paystackReq.end();
    });

    if (result.data?.status === 'success') {
      if (orderId) {
        await Order.findByIdAndUpdate(orderId, {
          paymentStatus: 'paid',
          paymentVerified: true,
          paymentRef: reference
        });
      }
      return res.json({ success: true, message: 'Payment verified' });
    }

    res.status(400).json({ success: false, message: 'Payment verification failed' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Payment verification error' });
  }
});

module.exports = router;
