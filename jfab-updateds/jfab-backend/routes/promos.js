const express   = require('express');
const router    = express.Router();
const PromoCode = require('../models/PromoCode');
const { protect, adminOnly } = require('../middleware/auth');

// ── GET /api/promos — public, returns only active codes (no values exposed) ──
// Used by frontend to validate at checkout
router.get('/validate/:code', async (req, res) => {
  try {
    const promo = await PromoCode.findOne({
      code: req.params.code.toUpperCase(),
      active: true
    });
    if (!promo) return res.status(404).json({ success: false, message: 'Invalid or inactive promo code' });
    res.json({ success: true, promo: { code: promo.code, type: promo.type, value: promo.value, description: promo.description } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/promos — Admin: list all ────────────────────────────────────────
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const promos = await PromoCode.find({}).sort({ createdAt: -1 });
    res.json({ success: true, promos });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/promos — Admin: create ─────────────────────────────────────────
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const promo = await PromoCode.create(req.body);
    res.status(201).json({ success: true, promo });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'Promo code already exists' });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT /api/promos/:id — Admin: update ──────────────────────────────────────
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const promo = await PromoCode.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!promo) return res.status(404).json({ success: false, message: 'Promo not found' });
    res.json({ success: true, promo });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE /api/promos/:id — Admin: delete ────────────────────────────────────
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await PromoCode.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/promos/seed — Admin: seed defaults ─────────────────────────────
router.post('/seed', protect, adminOnly, async (req, res) => {
  try {
    const defaults = [
      { code: 'JFAB10',    type: 'percent',  value: 10,  description: '10% off your order',   active: true },
      { code: 'WELCOME15', type: 'percent',  value: 15,  description: '15% welcome discount',  active: true },
      { code: 'FREESHIP',  type: 'shipping', value: 100, description: 'Free delivery',          active: true },
      { code: 'JFAB500',   type: 'fixed',    value: 500, description: '₦500 off order',         active: true }
    ];
    for (const p of defaults) {
      await PromoCode.findOneAndUpdate({ code: p.code }, p, { upsert: true, setDefaultsOnInsert: true });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
