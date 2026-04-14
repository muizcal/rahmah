# 🌹 J-Fab Perfumes — Backend Setup Guide

---

## What the Backend Does

| Feature | Without Backend | With Backend |
|---|---|---|
| User accounts | Browser only | Real database, works everywhere |
| Orders | Lost if browser cleared | Saved permanently in MongoDB |
| Emails | Opens mail app manually | Sent automatically on every order |
| Admin orders/customers | localStorage only | Pulls live data from database |
| Perfume requests | Lost in browser | Saved in database |

---

## Step 1 — MongoDB Atlas (Free Database)

1. Go to **https://cloud.mongodb.com** → sign up free
2. Create a free cluster → any region
3. **Database Access** → Add user → username + password → save both
4. **Network Access** → Add IP → **Allow Access from Anywhere** (0.0.0.0/0)
5. **Connect** → Drivers → copy the URI:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/
   ```
   Add database name at the end:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/jfab-perfumes
   ```

---

## Step 2 — Gmail App Password (for Emails)

1. Go to **myaccount.google.com** → Security
2. Turn on **2-Step Verification** (required)
3. Search "App Passwords" → create one → name it "J-Fab"
4. Copy the 16-character password shown

---

## Step 3 — Create Your .env File

Copy `.env.example` to `.env` and fill in all values:

```env
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb+srv://...
JWT_SECRET=paste_a_long_random_string_here
JWT_EXPIRES_IN=30d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_16_char_app_password
EMAIL_FROM="J-Fab Perfumes <your_gmail@gmail.com>"
STORE_EMAIL=muizcal@gmail.com
FRONTEND_URL=https://your-site.com
PAYSTACK_SECRET_KEY=sk_live_your_key_here
```

Generate a JWT secret with:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Step 4 — Deploy Backend to Railway (Free)

1. Push the `jfab-backend` folder to GitHub
2. Go to **railway.app** → New Project → Deploy from GitHub
3. Select your repo → Railway auto-detects Node.js
4. Click **Variables** → add all env vars from your `.env` file
5. Railway gives you a URL like: `https://jfab-api.up.railway.app`

---

## Step 5 — Create Admin User

After deploying, run this ONCE from your local machine:

```bash
cd jfab-backend
# Make sure .env has MONGO_URI set
node seed-admin.js
```

This creates the admin account. Default credentials:
- Email: `admin@jfabperfumes.com`
- Password: `jfab2024`

**Change your password after first login** via Settings in the admin panel.

---

## Step 6 — Update Frontend API URL

In `js/app.js`, the `API_BASE` auto-detects:
- **Localhost** → `http://localhost:5000/api`
- **Deployed** → uses your Railway URL

You need to add your Railway URL to `index.html` in the `<head>`:

```html
<!-- Add before closing </head> -->
<script>
  // Override API base for deployed version
  window.JFAB_API = 'https://your-railway-url.up.railway.app/api';
</script>
```

Then in `js/app.js` change `API_BASE` to:
```js
const API_BASE = window.JFAB_API ||
  (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');
```

---

## Step 7 — Add Paystack Public Key

In `index.html`, add before `</head>`:
```html
<script>window.PAYSTACK_PUBLIC_KEY = 'pk_live_your_public_key_here';</script>
<script src="https://js.paystack.co/v1/inline.js"></script>
```

Get your keys from: **dashboard.paystack.com** → Settings → API Keys

---

## Step 8 — Update CORS

In your Railway environment variables, set:
```
FRONTEND_URL=https://your-website-url.com
```

This allows your frontend to talk to the backend.

---

## API Endpoints Summary

| Method | Endpoint | What it does |
|---|---|---|
| GET | `/api/health` | Check if server is running |
| POST | `/api/auth/register` | Create user account |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/admin-login` | Admin panel login |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/orders` | Place new order |
| GET | `/api/orders` | Get all orders (admin) |
| GET | `/api/orders/my` | Get user's orders |
| PUT | `/api/orders/:id/status` | Update order status (admin) |
| POST | `/api/requests` | Submit perfume request |
| GET | `/api/requests` | Get all requests (admin) |
| PUT | `/api/requests/:id/status` | Update request status (admin) |

---

## Testing Locally

```bash
cd jfab-backend
npm install
cp .env.example .env
# Fill in .env values
npm run dev
```

Visit: `http://localhost:5000/api/health`

You should see:
```json
{ "success": true, "message": "J-Fab Perfumes API is running 🌹" }
```
