// dotenv is loaded by server.js — no need to load again here
const express    = require('express');
const multer     = require('multer');
const nodemailer = require('nodemailer');

const router = express.Router();

// ── Multer Memory Storage (Vercel-compatible) ─────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
});

// ── Create Gmail transporter ───────────────────────────────────────────────────
// Created fresh per-request so env vars are always read at runtime
function makeTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',          // nodemailer's built-in Gmail preset (port 465/587 auto)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,  // Gmail App Password (no 2FA bypass needed)
    },
  });
}

// ── Helper: Price Labels ───────────────────────────────────────────────────────
const PRICE_TABLE = {
  'reports':             { '2day': '₹150', '1day': '₹200', halfday: '₹250', '1hour': '₹300', '30min': '₹350' },
  'ppt':                 { '2day': '₹100', '1day': '₹150', halfday: '₹200', '1hour': '₹250', '30min': '₹300' },
  'abstract':            { flat: '₹59' },
  'ece projects':        { basic: '₹300', medium: '₹450', complex: '₹600' },
  'plagiarism checking': { flat: '₹20' },
};

function getPrice(service, deliveryTime) {
  const key = service?.toLowerCase().trim();
  const svc = PRICE_TABLE[key];
  if (!svc) return 'As discussed';
  return svc[deliveryTime] || svc['flat'] || 'As discussed';
}

// ── POST /api/order ────────────────────────────────────────────────────────────
router.post('/', upload.array('files', 10), async (req, res) => {
  const { name, email, phone, service, deliveryTime, topic, description } = req.body;
  const files = req.files || [];
  const price = getPrice(service, deliveryTime);

  const attachments = files.map((f) => ({
    filename: f.originalname,
    content:  f.buffer,
  }));

  const deliveryLabel = {
    '2day': '2 Days', '1day': '1 Day', halfday: '12 Hours', '1hour': '1 Hour', '30min': '30 Minutes',
    flat: 'Standard', basic: 'Basic Complexity', medium: 'Medium Complexity', complex: 'High Complexity',
  }[deliveryTime] || deliveryTime;

  // ── Admin Email HTML ──────────────────────────────────────────────────────────
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
          <tr><td style="padding:10px 0;border-bottom:1px solid #f0e8cc;font-weight:600;">Delivery</td><td style="padding:10px 0;border-bottom:1px solid #f0e8cc;">${deliveryLabel}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #f0e8cc;font-weight:600;">Price</td><td style="padding:10px 0;border-bottom:1px solid #f0e8cc;color:#e63946;font-weight:700;font-size:17px;">${price}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #f0e8cc;font-weight:600;">Topic</td><td style="padding:10px 0;border-bottom:1px solid #f0e8cc;">${topic}</td></tr>
          <tr><td style="padding:10px 0;font-weight:600;vertical-align:top;">Description</td><td style="padding:10px 0;white-space:pre-line;">${description}</td></tr>
        </table>
        ${files.length > 0
          ? `<p style="margin-top:20px;font-weight:600;">📎 Attached (${files.length}):</p><ul style="margin:8px 0;padding-left:20px;color:#555;">${files.map(f => `<li>${f.originalname}</li>`).join('')}</ul>`
          : '<p style="margin-top:20px;color:#888;font-style:italic;">No files attached.</p>'}
      </div>
      <div style="background:#f5c518;padding:16px 32px;text-align:center;">
        <p style="margin:0;color:#1a1a2e;font-size:13px;">contactforservices — Admin Notification</p>
      </div>
    </div>
  `;

  // ── User Confirmation HTML ────────────────────────────────────────────────────
  const userHtml = `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#fffdf5;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,#f5c518 0%,#e8a800 100%);padding:28px 32px;">
        <h1 style="margin:0;color:#1a1a2e;font-size:22px;font-weight:700;">✅ Order Confirmed — contactforservices</h1>
        <p style="margin:6px 0 0;color:#1a1a2e;opacity:0.75;font-size:14px;">Thank you for choosing us!</p>
      </div>
      <div style="padding:28px 32px;color:#1a1a2e;">
        <p style="font-size:16px;">Hi <strong>${name}</strong>,</p>
        <p style="font-size:15px;line-height:1.6;">Your order is confirmed! Here's a summary:</p>
        <div style="background:#fff8e7;border-radius:10px;padding:20px;margin:20px 0;border-left:4px solid #f5c518;">
          <p style="margin:0 0 8px;"><strong>Service:</strong> ${service}</p>
          <p style="margin:0 0 8px;"><strong>Topic:</strong> ${topic}</p>
          <p style="margin:0 0 8px;"><strong>Delivery:</strong> ${deliveryLabel}</p>
          <p style="margin:0;"><strong>Price:</strong> <span style="color:#e63946;font-weight:700;font-size:18px;">${price}</span></p>
        </div>
        <p style="font-size:15px;line-height:1.6;">We'll contact you at <strong>${email}</strong> or <strong>${phone}</strong> shortly.</p>
      </div>
      <div style="background:#f5c518;padding:16px 32px;text-align:center;">
        <p style="margin:0;color:#1a1a2e;font-size:13px;">contactforservices | Chill the College Life. We Handle the Work.</p>
      </div>
    </div>
  `;

  try {
    const transporter = makeTransporter();

    // Verify connection first (catches wrong credentials immediately)
    await transporter.verify();

    // Send admin notification
    await transporter.sendMail({
      from:        `"contactforservices" <${process.env.SMTP_USER}>`,
      to:          process.env.ADMIN_EMAIL,
      subject:     `🆕 New Order: ${service} — ${name}`,
      html:        adminHtml,
      attachments,
    });

    // Send user confirmation
    await transporter.sendMail({
      from:    `"contactforservices" <${process.env.SMTP_USER}>`,
      to:      email,
      subject: '✅ Order Confirmed — contactforservices',
      html:    userHtml,
    });

    res.json({ success: true, message: 'Order placed! Check your email for confirmation.' });

  } catch (err) {
    console.error('Email error:', err.message);
    res.status(500).json({
      success: false,
      message: `Order received but email failed: ${err.message}`,
    });
  }
});

module.exports = router;
