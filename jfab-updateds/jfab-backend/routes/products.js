const express  = require('express');
const router   = express.Router();
const Product  = require('../models/Product');
const { protect, adminOnly } = require('../middleware/auth');

// ── GET /api/products — public, list all ─────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({}).sort({ id: 1 });
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/products/:id — public, single product ───────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findOne({ id: parseInt(req.params.id) });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/products — Admin: create ────────────────────────────────────────
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const last = await Product.findOne({}).sort({ id: -1 });
    const nextId = last ? last.id + 1 : 1;
    const product = await Product.create({ ...req.body, id: nextId });
    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT /api/products/:id — Admin: update ────────────────────────────────────
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { id: parseInt(req.params.id) },
      req.body,
      { new: true }
    );
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE /api/products/:id — Admin: delete ─────────────────────────────────
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Product.findOneAndDelete({ id: parseInt(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/products/deduct-stock — called after successful order ───────────
// Body: [{ id, qty }]
router.post('/deduct-stock', async (req, res) => {
  try {
    const { items } = req.body; // [{ id, qty }]
    if (!Array.isArray(items)) return res.status(400).json({ success: false, message: 'items array required' });
    for (const item of items) {
      await Product.findOneAndUpdate(
        { id: Number(item.id), stock: { $gte: item.qty } },
        { $inc: { stock: -item.qty } }
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/products/seed — Admin: bulk seed (initial import) ──────────────
router.post('/seed', protect, adminOnly, async (req, res) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products)) return res.status(400).json({ success: false, message: 'products array required' });
    // Upsert each by numeric id
    for (const p of products) {
      await Product.findOneAndUpdate(
        { id: p.id },
        p,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    res.json({ success: true, count: products.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
