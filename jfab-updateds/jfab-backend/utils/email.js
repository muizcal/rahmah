const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,  // true for 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ─── Shared email wrapper ───────────────────────────────────────────────────
function wrapEmail(innerHtml, previewText = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>J-Fab Perfumes</title>
  <style>
    body { margin:0; padding:0; background:#f9f6f0; font-family:'Helvetica Neue',Arial,sans-serif; }
    a { color: #C9A84C; }
  </style>
</head>
<body>
${previewText ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${previewText}</div>` : ''}
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f6f0;padding:40px 16px">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

      <!-- LOGO HEADER -->
      <tr><td style="background:linear-gradient(135deg,#1a1209 0%,#2d2010 100%);border-radius:16px 16px 0 0;padding:36px 40px;text-align:center">
        <div style="font-family:Georgia,serif;font-size:30px;color:#C9A84C;letter-spacing:4px;margin-bottom:4px">J·FAB</div>
        <div style="font-size:9px;letter-spacing:5px;text-transform:uppercase;color:rgba(201,168,76,0.55)">PERFUMES SIGNATURE</div>
        <div style="width:48px;height:1px;background:rgba(201,168,76,0.3);margin:18px auto 0"></div>
      </td></tr>

      <!-- CONTENT -->
      <tr><td style="background:#ffffff;padding:40px">
        ${innerHtml}
      </td></tr>

      <!-- FOOTER -->
      <tr><td style="background:#f0ebe0;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center">
        <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;margin-bottom:8px">J-FAB PERFUMES SIGNATURE</div>
        <p style="margin:0;color:#888;font-size:12px">FH84+5Q6, Ikota, Lekki 101245, Lagos</p>
        <p style="margin:8px 0 0;font-size:12px;color:#aaa">
          <a href="https://wa.me/2348147474278" style="color:#C9A84C;text-decoration:none">WhatsApp</a> &nbsp;•&nbsp;
          <a href="mailto:muizcal@gmail.com" style="color:#C9A84C;text-decoration:none">muizcal@gmail.com</a> &nbsp;•&nbsp;
          <a href="https://instagram.com/j_fabperfumes" style="color:#C9A84C;text-decoration:none">@j_fabperfumes</a>
        </p>
        <p style="margin:10px 0 0;color:#bbb;font-size:11px">© ${new Date().getFullYear()} J-Fab Perfumes. All rights reserved.</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ─── Email Templates ────────────────────────────────────────────────────────

// 1. Welcome email after registration
function welcomeHtml(name) {
  return wrapEmail(`
    <div style="text-align:center;margin-bottom:32px">
      <div style="font-size:52px;margin-bottom:12px">🌹</div>
      <h1 style="font-family:Georgia,serif;font-size:26px;color:#1a1209;font-weight:400;margin:0 0 10px">Welcome to J-Fab!</h1>
      <p style="color:#888;font-size:14px;margin:0">Your fragrance journey begins here</p>
    </div>
    <p style="color:#444;font-size:15px;line-height:1.7">Hi <strong>${name}</strong>,</p>
    <p style="color:#444;font-size:15px;line-height:1.7">
      Thank you for joining <strong>J-Fab Perfumes</strong> — Lagos' premier destination for authentic luxury fragrances. 
      Your account is now active and ready to use.
    </p>

    <div style="background:#faf7f2;border:1px solid #e8dfc9;border-radius:12px;padding:24px;margin:24px 0">
      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999;margin-bottom:16px">What you get as a member</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:8px 0;color:#444;font-size:14px">⭐ &nbsp;Earn loyalty points on every order</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#444;font-size:14px">📦 &nbsp;Track all your orders in one place</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#444;font-size:14px">🔔 &nbsp;Get notified when requested perfumes arrive</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#444;font-size:14px">🎁 &nbsp;Exclusive member-only deals and early access</td>
        </tr>
      </table>
    </div>

    <div style="text-align:center;margin-top:32px">
      <a href="${process.env.FRONTEND_URL}" style="display:inline-block;background:linear-gradient(135deg,#C9A84C,#e8c96a);color:#1a1209;padding:14px 36px;border-radius:30px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:1px">
        Shop Now →
      </a>
    </div>
  `, `Welcome to J-Fab Perfumes, ${name}!`);
}

// 2. Order confirmation email
function orderConfirmationHtml(order) {
  const { ref, customerName, items, total, deliveryType, deliveryZone, deliveryAddress, deliveryCost, discount = 0, promoUsed = null, createdAt } = order;
  const formattedDate = new Date(createdAt).toLocaleString('en-NG', { dateStyle: 'long', timeStyle: 'short' });
  const deliveryLabel =
    deliveryType === 'pickup' ? '🏪 Store Pickup (FREE)' :
    deliveryZone === 'island' ? '🚚 Island Delivery — ₦2,500' :
    deliveryZone === 'mainland' ? '🚚 Mainland Delivery — ₦3,500' : '🚚 Outside Lagos — ₦5,000';

  const itemRows = items.map(item => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f0ebe0;color:#2c2c2c;font-size:14px">${item.name}</td>
      <td style="padding:12px 0;border-bottom:1px solid #f0ebe0;text-align:center;color:#888;font-size:13px">×${item.qty}</td>
      <td style="padding:12px 0;border-bottom:1px solid #f0ebe0;text-align:right;font-weight:700;color:#C9A84C;font-size:14px">₦${(item.price * item.qty).toLocaleString()}</td>
    </tr>`).join('');

  return wrapEmail(`
    <div style="text-align:center;margin-bottom:32px">
      <div style="font-size:52px;margin-bottom:12px">🎉</div>
      <h1 style="font-family:Georgia,serif;font-size:26px;color:#1a1209;font-weight:400;margin:0 0 8px">Order Confirmed!</h1>
      <p style="color:#888;font-size:14px;margin:0">Thank you, <strong>${customerName}</strong></p>
    </div>

    <!-- ORDER REF -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
      <tr><td style="background:#faf7f2;border:1px solid #e8dfc9;border-radius:10px;padding:20px;text-align:center">
        <div style="font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#aaa;margin-bottom:6px">Order Reference</div>
        <div style="font-size:22px;font-weight:700;color:#C9A84C;letter-spacing:2px">${ref}</div>
        <div style="font-size:12px;color:#aaa;margin-top:4px">${formattedDate}</div>
      </td></tr>
    </table>

    <!-- ITEMS -->
    <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#aaa;padding-bottom:10px;border-bottom:2px solid #f0ebe0;margin-bottom:4px">Your Order</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${itemRows}
      <tr>
        <td colspan="3" style="padding-top:14px">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${deliveryCost > 0 ? `<tr>
              <td style="font-size:13px;color:#888;padding-bottom:6px">Delivery</td>
              <td style="text-align:right;font-size:13px;color:#888;padding-bottom:6px">₦${deliveryCost.toLocaleString()}</td>
            </tr>` : `<tr>
              <td style="font-size:13px;color:#27ae60;padding-bottom:6px">Delivery</td>
              <td style="text-align:right;font-size:13px;color:#27ae60;font-weight:600;padding-bottom:6px">FREE</td>
            </tr>`}
            ${order.discount > 0 ? `<tr>
              <td style="font-size:13px;color:#e74c3c;padding-bottom:6px">Discount${order.promoUsed ? ' (' + order.promoUsed + ')' : ''}</td>
              <td style="text-align:right;font-size:13px;color:#e74c3c;font-weight:600;padding-bottom:6px">-₦${order.discount.toLocaleString()}</td>
            </tr>` : ''}
            ${order.promoUsed && order.discount === 0 ? `<tr>
              <td style="font-size:13px;color:#27ae60;padding-bottom:6px">Promo (${order.promoUsed})</td>
              <td style="text-align:right;font-size:13px;color:#27ae60;font-weight:600;padding-bottom:6px">Free Shipping</td>
            </tr>` : ''}
            <tr>
              <td style="font-size:16px;font-weight:700;color:#1a1209;font-family:Georgia,serif">Total Paid</td>
              <td style="text-align:right;font-size:22px;font-weight:700;color:#C9A84C">₦${total.toLocaleString()}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- DELIVERY INFO -->
    <div style="background:#faf7f2;border-left:3px solid #C9A84C;border-radius:0 8px 8px 0;padding:16px 20px;margin:28px 0">
      <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#aaa;margin-bottom:6px">Delivery Details</div>
      <div style="color:#2c2c2c;font-size:14px;font-weight:600">${deliveryLabel}</div>
      ${deliveryAddress && deliveryAddress !== 'Store Pickup' ? `<div style="color:#666;font-size:13px;margin-top:4px">📍 ${deliveryAddress}</div>` : ''}
    </div>

    <!-- WHAT'S NEXT -->
    <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#aaa;margin-bottom:18px">What Happens Next?</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${[
        ['Order Processing', 'We\'re preparing your fragrance with care'],
        ['Dispatch & Shipping', deliveryType === 'pickup' ? 'Ready for pickup at Ikota Shopping Complex, VGC' : 'Delivered within 1–3 business days'],
        ['Enjoy Your Scent! 🌹', 'Your signature fragrance has arrived']
      ].map(([title, desc], i) => `
      <tr>
        <td width="44" valign="top" style="padding-right:14px;padding-bottom:18px">
          <div style="width:34px;height:34px;background:${i === 2 ? '#C9A84C' : '#faf7f2'};border:1px solid #C9A84C;border-radius:50%;text-align:center;line-height:34px;font-size:13px;color:${i === 2 ? '#1a1209' : '#C9A84C'};font-weight:700">${i + 1}</div>
        </td>
        <td valign="top" style="padding-bottom:18px">
          <div style="font-weight:600;color:#2c2c2c;font-size:14px">${title}</div>
          <div style="color:#888;font-size:13px;margin-top:3px">${desc}</div>
        </td>
      </tr>`).join('')}
    </table>

    <!-- HELP -->
    <div style="background:#1a1209;border-radius:12px;padding:24px;text-align:center;margin-top:8px">
      <div style="color:#C9A84C;font-family:Georgia,serif;font-size:16px;margin-bottom:6px">Need Help?</div>
      <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:0 0 16px">We're always happy to assist you</p>
      <a href="https://wa.me/2348147474278" style="display:inline-block;background:#C9A84C;color:#1a1209;padding:10px 24px;border-radius:20px;text-decoration:none;font-weight:700;font-size:13px;margin:4px">💬 WhatsApp</a>
      <a href="mailto:muizcal@gmail.com" style="display:inline-block;background:transparent;color:#C9A84C;border:1px solid #C9A84C;padding:10px 24px;border-radius:20px;text-decoration:none;font-size:13px;margin:4px">📧 Email</a>
    </div>
  `, `Order ${ref} confirmed — J-Fab Perfumes`);
}

// 3. Password reset email
function passwordResetHtml(name, resetUrl) {
  return wrapEmail(`
    <div style="text-align:center;margin-bottom:28px">
      <div style="font-size:52px;margin-bottom:10px">🔐</div>
      <h1 style="font-family:Georgia,serif;font-size:24px;color:#1a1209;font-weight:400;margin:0 0 8px">Reset Your Password</h1>
      <p style="color:#888;font-size:14px;margin:0">We received a request to reset your J-Fab account password</p>
    </div>
    <p style="color:#444;font-size:15px;line-height:1.7">Hi <strong>${name}</strong>,</p>
    <p style="color:#444;font-size:15px;line-height:1.7">
      No worries — it happens to the best of us. Click the button below to set a new password.
      This link is valid for <strong>1 hour</strong>.
    </p>
    <div style="text-align:center;margin:36px 0">
      <a href="${resetUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#C9A84C,#a8873c);color:#1a1209;padding:15px 40px;border-radius:30px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.5px;box-shadow:0 4px 16px rgba(201,168,76,0.35)">
        Reset My Password
      </a>
    </div>
    <div style="background:#faf7f2;border-left:3px solid #C9A84C;border-radius:0 8px 8px 0;padding:16px 20px;margin:24px 0">
      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#aaa;margin-bottom:6px">Link not working?</div>
      <p style="color:#888;font-size:12px;margin:0;word-break:break-all">Copy and paste this URL into your browser:<br>
        <span style="color:#C9A84C">${resetUrl}</span>
      </p>
    </div>
    <p style="color:#aaa;font-size:13px;text-align:center;margin-top:28px">
      If you didn't request a password reset, you can safely ignore this email.<br>
      Your password will remain unchanged.
    </p>
  `, 'Reset your J-Fab Perfumes password');
}

// 4. Perfume request confirmation to customer
function requestConfirmationHtml(req) {
  return wrapEmail(`
    <div style="text-align:center;margin-bottom:28px">
      <div style="font-size:48px;margin-bottom:10px">🔔</div>
      <h1 style="font-family:Georgia,serif;font-size:24px;color:#1a1209;font-weight:400;margin:0 0 8px">Request Received!</h1>
      <p style="color:#888;font-size:14px;margin:0">We've noted your fragrance request</p>
    </div>
    <p style="color:#444;font-size:15px;line-height:1.7">Hi <strong>${req.yourName}</strong>,</p>
    <p style="color:#444;font-size:15px;line-height:1.7">
      We've received your request for <strong style="color:#C9A84C">${req.perfumeName}</strong>. 
      Our team will reach out to you as soon as this fragrance becomes available.
    </p>
    <div style="background:#faf7f2;border:1px solid #e8dfc9;border-radius:10px;padding:20px;margin:24px 0">
      <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#aaa;margin-bottom:12px">Request Summary</div>
      <table width="100%">
        <tr><td style="color:#888;font-size:13px;padding:5px 0">Reference</td><td style="color:#C9A84C;font-weight:700;font-size:13px;text-align:right">${req.ref}</td></tr>
        <tr><td style="color:#888;font-size:13px;padding:5px 0">Perfume</td><td style="color:#2c2c2c;font-size:13px;text-align:right">${req.perfumeName}</td></tr>
        <tr><td style="color:#888;font-size:13px;padding:5px 0">Your Contact</td><td style="color:#2c2c2c;font-size:13px;text-align:right">${req.phone}</td></tr>
      </table>
    </div>
    <p style="color:#888;font-size:13px;text-align:center">Have questions? Reach us on WhatsApp: <a href="https://wa.me/2348147474278">08147474278</a></p>
  `, `Your perfume request has been received — J-Fab`);
}

// ─── Send helper ────────────────────────────────────────────────────────────
async function sendEmail({ to, subject, html, text }) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"J-Fab Perfumes" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text: text || subject
    });
    console.log(`📧 Email sent to ${to}`);
    return true;
  } catch (err) {
    console.error('❌ Email error:', err.message);
    return false;
  }
}

module.exports = {
  sendEmail,
  templates: {
    welcomeHtml,
    orderConfirmationHtml,
    requestConfirmationHtml,
    passwordResetHtml
  }
};
