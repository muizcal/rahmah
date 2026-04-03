# 💄 Makeup by Rahmah — PWA Alarm System

## How it works
1. Appointment is booked → saved to Supabase
2. At reminder time → server sends a **push notification** to Rahmah's phone
3. Phone wakes up and shows the notification — **even if the app is closed**
4. Rahmah taps it → app opens → alarm rings with her favourite song
5. Alarm keeps ringing until she taps "Dismiss"

---

## What you need (all free)
| Service | Purpose | Free? |
|---|---|---|
| **Supabase** | Stores appointments + push subscriptions | Free forever |
| **Render** | Runs the backend server (never sleeps on paid, but free tier works) | Free |
| **Vercel** | Hosts the frontend | Free forever |

---

## Step 1 — Set up Supabase

1. Go to **supabase.com** → sign up → New project
2. Wait for it to start (~1 min)
3. Go to **SQL Editor** → New query → paste contents of `supabase-setup.sql` → Run
4. Go to **Settings → API** → copy:
   - `Project URL` → this is your `SUPABASE_URL`
   - `service_role` secret key → this is your `SUPABASE_SERVICE_KEY`

---

## Step 2 — Generate VAPID keys

VAPID keys are what allow your server to send push notifications securely.

```bash
cd rahmah-pwa
npm install
node generate-vapid.js
```

Copy the two keys it prints. You need them in the next step.

---

## Step 3 — Deploy backend to Render

1. Push this folder to GitHub
2. Go to **render.com** → sign up → New Web Service → connect your repo
3. Settings:
   - Build command: `npm install`
   - Start command: `npm start`
4. Add these environment variables:

```
SUPABASE_URL         = https://xxxx.supabase.co
SUPABASE_SERVICE_KEY = your_service_role_key
VAPID_PUBLIC_KEY     = your_vapid_public_key
VAPID_PRIVATE_KEY    = your_vapid_private_key
VAPID_EMAIL          = mailto:your@email.com
PORT                 = 3000
```

5. Deploy → copy your Render URL (e.g. `https://rahmah.onrender.com`)

---

## Step 4 — Update frontend with your Render URL

In `public/index.html`, find line:
```js
const API = ''; // same origin
```

If deploying frontend separately to Vercel, change to:
```js
const API = 'https://your-render-url.onrender.com';
```

If serving frontend FROM Render (recommended — simpler), keep it as `''`.

**Recommended: serve everything from Render.** The backend already serves the
`public/` folder as static files. So just deploy the whole project to Render
and point your domain there. No separate Vercel needed.

---

## Step 5 — Add to home screen & allow notifications

1. Open your Render URL in Safari (iPhone) or Chrome (Android)
2. Tap **Share → Add to Home Screen** (if not already done)
3. Open the app → it will ask for notification permission → tap **Allow**
4. Done. The app is now installed and push is active.

---

## Step 6 — Test it

1. Book an appointment for 2 minutes from now
2. Set reminder to "5 minutes before" (so it fires in ~1 minute)
3. **Close the app completely**
4. Wait → your phone should receive a push notification
5. Tap it → app opens → alarm rings

---

## Keep Render alive (important)

Render's free tier sleeps after 15 minutes. For push to work 24/7:

**Option A — UptimeRobot (free)**
1. Sign up at uptimerobot.com
2. New monitor → HTTP → URL: `https://your-render-url.onrender.com/api/ping`
3. Interval: 5 minutes
4. Done — server stays awake forever

**Option B — Upgrade Render to $7/month** for always-on.

---

## File structure
```
rahmah-pwa/
├── server.js              Backend (Express + cron + web-push)
├── public/
│   ├── index.html         Frontend app
│   ├── sw.js              Service Worker (receives push when app closed)
│   ├── manifest.json      PWA manifest
│   └── icons/             App icons
├── generate-vapid.js      Run once to get VAPID keys
├── supabase-setup.sql     Run once in Supabase SQL editor
├── package.json
└── .env.example
```
