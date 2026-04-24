// dotenv is loaded by server.js — no need to load again here
const express = require('express');
const multer  = require('multer');

const router = express.Router();

// ── Multer Memory Storage (Vercel-compatible) ─────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
});

// ── Helper: Send email via Resend HTTP API ────────────────────────────────────
// Resend uses HTTPS (not SMTP), so it works on Vercel without port issues.
async function sendViaResend({ to, subject, html, attachments = [] }) {
  const body = {
    from: 'contactforservices <onboarding@resend.dev>',
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  };

  // Attach files as base64 if any
  if (attachments.length > 0) {
    body.attachments = attachments.map((f) => ({
      filename: f.originalname,
      content:  f.buffer.toString('base64'),
    }));
  }

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error ${res.status}: ${err}`);
  }
  return res.json();
}

// ── Helper: Price Labels ───────────────────────────────────────────────────────
const PRICE_TABLE = {
  reports:     { '1day': '₹150', halfday: '₹200', '1hour': '₹250', '30min': '₹300' },
  ppt:         { '1day': '₹100', halfday: '₹150', '1hour': '₹200', '30min': '₹250' },
  abstract:    { flat: '₹80' },
  ece:         { basic: '₹300', medium: '₹450', complex: '₹600' },
  plagiarism:  { flat: '₹60' },
};

function getPrice(service, deliveryTime) {
  const svc = PRICE_TABLE[service?.toLowerCase()];
  if (!svc) return 'As discussed';
  return svc[deliveryTime] || svc['flat'] || 'As discussed';
}

// ── POST /api/order ────────────────────────────────────────────────────────────
router.post('/', upload.array('files', 10), async (req, res) => {
  const { name, email, phone, service, deliveryTime, topic, description } = req.body;
  const files = req.files || [];
  const price = getPrice(service, deliveryTime);

  const deliveryLabel = {
    '1day': '1 Day', halfday: 'Half Day', '1hour': '1 Hour', '30min': '30 Minutes',
    flat: 'Standard', basic: 'Basic Complexity', medium: 'Medium Complexity', complex: 'High Complexity',
  }[deliveryTime] || deliveryTime;

  // ── Admin Email ──────────────────────────────────────────────────────────────
  const adminHtml = `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#fffdf5;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,#f5c518 0%,#e8a800 100%);padding:28px 32px;">
        <h1 style="margin:0;color:#1a1a2e;font-size:22px;font-weight:700;">📋 New Order — contactforservices</h1>
        <p style="margin:6px 0 0;color:#1a1a2e;opacity:0.75;font-size:14px;">Received on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
      </div>
      <div style="padding:28px 32px;">
        <table style="width:100%;border-collapse:collapse;font-size:15px;color:#1a1a2e;">
          <tr><td style="padding:10px 0;border-bottom:1px solid #f0e8cc;font-weight:600;width:160px;">Customer Name</td><td style="padding:10px 0;border-bottom:1px solid #f0e8cc;">${name}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #f0e8cc;font-weight:600;">Email</td><td style="padding:10px 0;border-bottom:1px solid #f0e8cc;"><a href="mailto:${email}" style="color:#e63946;">${email}</a></td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #f0e8cc;font-weight:600;">Phone</td><td style="padding:10px 0;border-bottom:1px solid #f0e8cc;">${phone}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #f0e8cc;font-weight:600;">Service</td><td style="padding:10px 0;border-bottom:1px solid #f0e8cc;">${service}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #f0e8cc;font-weight:600;">Delivery Time</td><td style="padding:10px 0;border-bottom:1px solid #f0e8cc;">${deliveryLabel}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #f0e8cc;font-weight:600;">Price Quoted</td><td style="padding:10px 0;border-bottom:1px solid #f0e8cc;color:#e63946;font-weight:700;font-size:17px;">${price}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #f0e8cc;font-weight:600;">Topic</td><td style="padding:10px 0;border-bottom:1px solid #f0e8cc;">${topic}</td></tr>
          <tr><td style="padding:10px 0;font-weight:600;vertical-align:top;">Description</td><td style="padding:10px 0;white-space:pre-line;">${description}</td></tr>
        </table>
        ${files.length > 0 ? `<p style="margin-top:20px;font-weight:600;color:#1a1a2e;">📎 Attached Files (${files.length}):</p><ul style="margin:8px 0;padding-left:20px;color:#555;">${files.map(f => `<li>${f.originalname}</li>`).join('')}</ul>` : '<p style="margin-top:20px;color:#888;font-style:italic;">No files attached.</p>'}
      </div>
      <div style="background:#f5c518;padding:16px 32px;text-align:center;">
        <p style="margin:0;color:#1a1a2e;font-size:13px;">contactforservices — Admin Notification</p>
      </div>
    </div>
  `;

  // ── User Confirmation Email ───────────────────────────────────────────────────
  const userHtml = `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#fffdf5;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,#f5c518 0%,#e8a800 100%);padding:28px 32px;">
        <h1 style="margin:0;color:#1a1a2e;font-size:22px;font-weight:700;">✅ Order Confirmed — contactforservices</h1>
        <p style="margin:6px 0 0;color:#1a1a2e;opacity:0.75;font-size:14px;">Thank you for choosing us!</p>
      </div>
      <div style="padding:28px 32px;color:#1a1a2e;">
        <p style="font-size:16px;">Hi <strong>${name}</strong>,</p>
        <p style="font-size:15px;line-height:1.6;">We've received your order and our team will begin working on it right away. Here's a summary:</p>
        <div style="background:#fff8e7;border-radius:10px;padding:20px;margin:20px 0;border-left:4px solid #f5c518;">
          <p style="margin:0 0 8px;"><strong>Service:</strong> ${service}</p>
          <p style="margin:0 0 8px;"><strong>Topic:</strong> ${topic}</p>
          <p style="margin:0 0 8px;"><strong>Delivery Time:</strong> ${deliveryLabel}</p>
          <p style="margin:0;"><strong>Price:</strong> <span style="color:#e63946;font-weight:700;font-size:18px;">${price}</span></p>
        </div>
        <p style="font-size:15px;line-height:1.6;">We'll contact you at <strong>${email}</strong> or <strong>${phone}</strong> with updates.</p>
      </div>
      <div style="background:#f5c518;padding:16px 32px;text-align:center;">
        <p style="margin:0;color:#1a1a2e;font-size:13px;">contactforservices | Chill the College Life. We Handle the Work.</p>
      </div>
    </div>
  `;

  try {
    // Send admin notification (with file attachments)
    await sendViaResend({
      to:          process.env.ADMIN_EMAIL,
      subject:     `🆕 New Order: ${service} — ${name}`,
      html:        adminHtml,
      attachments: files,
    });

    // Send user confirmation (no attachments)
    await sendViaResend({
      to:      email,
      subject: '✅ Order Confirmed — contactforservices',
      html:    userHtml,
    });

    res.json({ success: true, message: 'Order placed! Check your email for confirmation.' });
  } catch (err) {
    console.error('Email error:', err.message);
    res.status(500).json({ success: false, message: `Order received but email failed: ${err.message}` });
  }
});

module.exports = router;
