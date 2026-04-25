require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const orderRouter = require('./routes/order');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Serve static frontend ─────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend')));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/order', orderRouter);

// ── DEBUG: Check env vars are loaded (remove after confirming) ──────────────
app.get('/api/debug-env', (req, res) => {
  res.json({
    RESEND_API_KEY: process.env.RESEND_API_KEY ? `set (length=${process.env.RESEND_API_KEY.length})` : '❌ MISSING',
    ADMIN_EMAIL:    process.env.ADMIN_EMAIL    ? `set (${process.env.ADMIN_EMAIL})`                  : '❌ MISSING',
  });
});

// ── Fallback: serve index.html for any unknown route ─────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅  QuickAcad server running at http://localhost:${PORT}\n`);
});
