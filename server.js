require('dotenv').config();
const express   = require('express');
const multer    = require('multer');
const cron      = require('node-cron');
const path      = require('path');
const { v4: uuidv4 } = require('uuid');
const webpush   = require('web-push');
const { createClient } = require('@supabase/supabase-js');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Supabase ──────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── Web Push VAPID ────────────────────────────────────────────────────────────
webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Multer (audio as base64) ──────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 25 * 1024 * 1024 }
});

// ═════════════════════════════════════════════════════════════════════════════
//  ROUTES
// ═════════════════════════════════════════════════════════════════════════════

// Health check
app.get('/api/ping', async (req, res) => {
  res.json({
    status: 'alive ✓',
    time:   new Date().toISOString(),
    config: {
      supabase:     process.env.SUPABASE_URL      ? '✓ set' : '✗ MISSING',
      vapid_public: process.env.VAPID_PUBLIC_KEY  ? '✓ set' : '✗ MISSING',
      vapid_private:process.env.VAPID_PRIVATE_KEY ? '✓ set' : '✗ MISSING',
    }
  });
});

// ── Serve VAPID public key to frontend ───────────────────────────────────────
app.get('/api/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// ── Push subscription — browser calls this once when user grants permission ──
app.post('/api/subscribe', async (req, res) => {
  const { subscription } = req.body;
  if (!subscription) return res.status(400).json({ error: 'No subscription' });

  // Save subscription to Supabase (upsert by endpoint so no duplicates)
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ endpoint: subscription.endpoint, subscription: JSON.stringify(subscription) },
             { onConflict: 'endpoint' });

  if (error) {
    console.error('[Subscribe error]', error.message);
    return res.status(500).json({ error: error.message });
  }
  console.log('[Subscribed] Push subscription saved');
  res.json({ success: true });
});

// ── Get all appointments ──────────────────────────────────────────────────────
app.get('/api/appointments', async (req, res) => {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .order('date', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  // Parse JSON fields before sending
  const safe = data.map(a => ({
    ...a,
    reminders:    typeof a.reminders    === 'string' ? JSON.parse(a.reminders)    : a.reminders,
    monthly_fired:typeof a.monthly_fired=== 'string' ? JSON.parse(a.monthly_fired): a.monthly_fired,
    // Never send audio data to list — fetch separately by id
    audio_data: undefined
  }));
  res.json(safe);
});

// ── Serve audio for a specific appointment ────────────────────────────────────
app.get('/api/audio/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('appointments')
    .select('audio_data, audio_mime')
    .eq('id', req.params.id)
    .single();

  if (error || !data?.audio_data) return res.status(404).send('No audio');
  const buf = Buffer.from(data.audio_data, 'base64');
  res.setHeader('Content-Type', data.audio_mime || 'audio/mpeg');
  res.setHeader('Content-Length', buf.length);
  res.send(buf);
});

// ── Book appointment ──────────────────────────────────────────────────────────
app.post('/api/appointments', upload.single('ringtone'), async (req, res) => {
  try {
    const {
      clientName, service, notes, date, time,
      reminders, monthlyCountdown
    } = req.body;

    if (!clientName || !date || !time) {
      return res.status(400).json({ success: false, error: 'clientName, date and time are required' });
    }

    const parsedReminders = JSON.parse(reminders || '[]');

    const appt = {
      id:               uuidv4(),
      client_name:      clientName.trim(),
      service:          service || 'Makeup',
      notes:            notes   || '',
      date,
      time,
      reminders:        JSON.stringify(parsedReminders),
      monthly_countdown: monthlyCountdown === 'true',
      audio_data:       req.file ? req.file.buffer.toString('base64') : null,
      audio_mime:       req.file ? req.file.mimetype : null,
      monthly_fired:    '[]',
      alarm_dismissed:  false,
      created_at:       new Date().toISOString()
    };

    const { error } = await supabase.from('appointments').insert(appt);
    if (error) throw new Error(error.message);

    console.log(`[Booked] "${appt.client_name}" on ${appt.date} at ${appt.time}`);

    // Return without audio data
    res.json({
      success: true,
      appointment: {
        ...appt,
        audio_data:    undefined,
        audio_mime:    undefined,
        ringtonePath:  appt.audio_data ? `/api/audio/${appt.id}` : null,
        reminders:     parsedReminders,
        clientName:    appt.client_name
      }
    });
  } catch (err) {
    console.error('[Book error]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Delete appointment ────────────────────────────────────────────────────────
app.delete('/api/appointments/:id', async (req, res) => {
  const { error } = await supabase.from('appointments').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ── Dismiss alarm ─────────────────────────────────────────────────────────────
app.post('/api/appointments/:id/dismiss', async (req, res) => {
  const { error } = await supabase
    .from('appointments')
    .update({ alarm_dismissed: true })
    .eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ═════════════════════════════════════════════════════════════════════════════
//  CRON — checks every minute, sends push notifications
// ═════════════════════════════════════════════════════════════════════════════
cron.schedule('* * * * *', async () => {
  const now = new Date();

  // Get all non-dismissed appointments
  const { data: appts, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('alarm_dismissed', false);

  if (error) { console.error('[Cron error]', error.message); return; }

  // Get all push subscriptions
  const { data: subs } = await supabase.from('push_subscriptions').select('*');
  if (!subs?.length) return;

  for (const appt of appts) {
    const apptTime = new Date(`${appt.date}T${appt.time}`);
    if (apptTime < now) continue;

    const reminders = typeof appt.reminders === 'string'
      ? JSON.parse(appt.reminders) : (appt.reminders || []);

    let dirty = false;

    for (let i = 0; i < reminders.length; i++) {
      const rem = reminders[i];
      if (rem.fired) continue;

      const fireAt = new Date(apptTime.getTime() - rem.minutesBefore * 60000);
      const diff   = fireAt - now;

      if (diff >= 0 && diff < 60000) {
        // Fire push notification to all subscriptions
        const payload = JSON.stringify({
          type:          'ALARM',
          appointmentId: appt.id,
          clientName:    appt.client_name,
          service:       appt.service,
          date:          appt.date,
          time:          appt.time,
          notes:         appt.notes,
          reminderLabel: rem.label,
          hasAudio:      !!appt.audio_data,
          title:         '💄 Makeup by Rahmah',
          body:          `${appt.service} with ${appt.client_name} at ${appt.time} — ${rem.label}`
        });

        for (const sub of subs) {
          try {
            await webpush.sendNotification(JSON.parse(sub.subscription), payload);
            console.log(`[Push] Sent for "${appt.client_name}" (${rem.label})`);
          } catch (err) {
            console.error('[Push error]', err.message);
            // Remove dead subscriptions (410 = gone, 404 = not found)
            if (err.statusCode === 410 || err.statusCode === 404) {
              await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
            }
          }
        }

        reminders[i].fired = true;
        dirty = true;
      }
    }

    if (dirty) {
      await supabase
        .from('appointments')
        .update({ reminders: JSON.stringify(reminders) })
        .eq('id', appt.id);
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n💄 Makeup by Rahmah PWA — port ${PORT}`);
  console.log(`   Supabase : ${process.env.SUPABASE_URL || 'NOT SET'}`);
  console.log(`   VAPID    : ${process.env.VAPID_PUBLIC_KEY ? 'set ✓' : 'NOT SET'}\n`);
});
