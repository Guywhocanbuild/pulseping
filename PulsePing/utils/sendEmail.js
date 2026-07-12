const nodemailer = require('nodemailer');

let transporter = null;

// Lazily build the transporter so a missing email config doesn't crash server startup —
// it just means emails silently no-op (logged), which is fine for local dev.
const getTransporter = () => {
  if (transporter) return transporter;

  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465, // true for 465, false for 587/others
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    family: 4,
  });

  return transporter;
};

/**
 * Sends an email. Never throws — logs and resolves so a mail-provider hiccup
 * never breaks signup/login. Callers should still `.catch` defensively.
 */
const sendEmail = async ({ to, subject, html }) => {
  const t = getTransporter();

  if (!t) {
    console.warn(`[mailer] EMAIL_HOST/EMAIL_USER/EMAIL_PASS not set — skipping email "${subject}" to ${to}`);
    return { skipped: true };
  }

  try {
    await t.sendMail({
      from: process.env.EMAIL_FROM || `"PulsePing" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error(`[mailer] Failed to send "${subject}" to ${to}:`, err.message);
    return { sent: false, error: err.message };
  }
};

module.exports = sendEmail;
