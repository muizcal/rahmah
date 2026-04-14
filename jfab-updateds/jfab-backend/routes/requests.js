const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const PerfumeRequest = require('../models/PerfumeRequest');
const { protect, optionalAuth, adminOnly } = require('../middleware/auth');
const { sendEmail, templates } = require('../utils/email');
const { v4: uuidv4 } = require('uuid');

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/requests/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'req-' + Date.now() + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  }
});

// ─── POST /api/requests — submit a perfume request ────────────────────────
router.post('/', optionalAuth, upload.single('image'), async (req, res) => {
  try {
    const { perfumeName, yourName, email, phone, details } = req.body;

    if (!perfumeName || !yourName || !email || !phone) {
      return res.status(400).json({ success: false, message: 'All required fields must be filled' });
    }

    const ref = 'REQ-' + Date.now() + '-' + uuidv4().slice(0, 4).toUpperCase();

    const imageUrl = req.file ? `/uploads/requests/${req.file.filename}` : null;

    const perfumeReq = await PerfumeRequest.create({
      ref, perfumeName, yourName, email, phone,
      details: details || '',
      imageUrl,
      user: req.user?._id || null
    });

    // Confirmation email to customer
    sendEmail({
      to: email,
      subject: `🔔 We received your request for ${perfumeName} — J-Fab Perfumes`,
      html: templates.requestConfirmationHtml(perfumeReq)
    });

    // Notify store owner
    sendEmail({
      to: process.env.STORE_EMAIL,
      subject: `📦 New Perfume Request: ${perfumeName} — ${yourName}`,
      html: templates.requestConfirmationHtml(perfumeReq)
    });

    res.status(201).json({ success: true, ref, message: 'Request submitted successfully' });
  } catch (err) {
    console.error('Request error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit request' });
  }
});

// ─── GET /api/requests/my — logged-in user's requests ────────────────────
router.get('/my', protect, async (req, res) => {
  const requests = await PerfumeRequest.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, requests });
});

// ─── GET /api/requests — Admin: all requests ──────────────────────────────
router.get('/', protect, adminOnly, async (req, res) => {
  const requests = await PerfumeRequest.find().sort({ createdAt: -1 }).populate('user', 'name email');
  res.json({ success: true, requests });
});

// ─── PUT /api/requests/:id/status — Admin: mark as available/notified ─────
router.put('/:id/status', protect, adminOnly, async (req, res) => {
  const { status } = req.body;
  const perfumeReq = await PerfumeRequest.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!perfumeReq) return res.status(404).json({ success: false, message: 'Request not found' });

  // If marking as available, email the customer
  if (status === 'available') {
    sendEmail({
      to: perfumeReq.email,
      subject: `✨ Great News! ${perfumeReq.perfumeName} is now available — J-Fab Perfumes`,
      html: `<p>Hi ${perfumeReq.yourName},<br><br>
      Great news! The perfume you requested — <strong>${perfumeReq.perfumeName}</strong> — is now available at J-Fab Perfumes!<br><br>
      Visit our store or WhatsApp us at 08147474278 to order yours before it sells out.<br><br>
      — J-Fab Perfumes Team</p>`
    });
  }

  res.json({ success: true, request: perfumeReq });
});

module.exports = router;
