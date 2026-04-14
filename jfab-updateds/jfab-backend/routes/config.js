const express  = require('express');
const router   = express.Router();
const SiteConfig = require('../models/SiteConfig');
const { protect, adminOnly } = require('../middleware/auth');

// ── Helper ──────────────────────────────────────────────────────────────────
async function getConfig(key) {
  const doc = await SiteConfig.findOne({ key });
  return doc ? doc.value : null;
}
async function setConfig(key, value) {
  return SiteConfig.findOneAndUpdate(
    { key },
    { value },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

// ── GET /api/config — public, returns announcement + flash sale ─────────────
router.get('/', async (req, res) => {
  try {
    const [ann, flash] = await Promise.all([
      getConfig('announcement'),
      getConfig('flash_sale')
    ]);
    res.json({ success: true, announcement: ann, flashSale: flash });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/config/announcement — public ───────────────────────────────────
router.get('/announcement', async (req, res) => {
  try {
    const val = await getConfig('announcement');
    res.json({ success: true, announcement: val });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT /api/config/announcement — admin only ───────────────────────────────
router.put('/announcement', protect, adminOnly, async (req, res) => {
  try {
    const { text } = req.body;
    if (text === '' || text === null || text === undefined) {
      await setConfig('announcement', null);
      return res.json({ success: true, announcement: null });
    }
    const val = { text, updated: new Date().toISOString() };
    await setConfig('announcement', val);
    res.json({ success: true, announcement: val });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/config/flash-sale — public ─────────────────────────────────────
router.get('/flash-sale', async (req, res) => {
  try {
    const val = await getConfig('flash_sale');
    res.json({ success: true, flashSale: val });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT /api/config/flash-sale — admin only ──────────────────────────────────
router.put('/flash-sale', protect, adminOnly, async (req, res) => {
  try {
    const sale = req.body; // { title, description, badge, endTime, productIds, active }
    if (!sale || sale.active === false) {
      const existing = await getConfig('flash_sale');
      const updated  = { ...(existing || {}), active: false };
      await setConfig('flash_sale', updated);
      return res.json({ success: true, flashSale: updated });
    }
    if (!sale.title || !sale.endTime) {
      return res.status(400).json({ success: false, message: 'title and endTime are required' });
    }
    sale.created = sale.created || new Date().toISOString();
    await setConfig('flash_sale', sale);
    res.json({ success: true, flashSale: sale });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
