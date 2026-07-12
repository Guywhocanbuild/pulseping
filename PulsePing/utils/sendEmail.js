const nodemailer = require('nodemailer');
const dns = require('dns').promises;

let transporter = null;

// Some hosts (Railway included) resolve Gmail's SMTP hostname to an IPv6
// address their container network can't actually route to, causing
// ENETUNREACH. We resolve the IPv4 address ourselves and connect to it
// directly — `tls.servername` keeps TLS certificate hostname checks correct
// even though we're connecting via a raw IP.
const buildTransporter = async () => {
  const { EMAIL_HOST, EMAIL_USER, EMAIL_PASS, EMAIL_PORT } = process.env;

  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
    return null;
  }

  let host = EMAIL_HOST;
  try {
    const addresses = await dns.resolve4(EMAIL_HOST);
    if (addresses && addresses[0]) host = addresses[0];
  } catch (err) {
    console.warn(`[mailer] Could not resolve IPv4 for ${EMAIL_HOST}, falling back to hostname:`, err.message);
  }

  return nodemailer.createTransport({
    host,
    port: Number(EMAIL_PORT) || 587,
    secure: Number(EMAIL_PORT) === 465,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
    tls: {
      servername: EMAIL_HOST, // keeps cert validation matching smtp.gmail.com, not the raw IP
    },
  });
};

const getTransporter = async () => {
  if (transporter) return transporter;
  transporter = await buildTransporter();
  return transporter;
};

/**
 * Sends an email. Never throws — logs and resolves so a mail-provider hiccup
 * never breaks signup/login. Callers should still `.catch` defensively.
 */
const sendEmail = async ({ to, subject, html }) => {
  const t = await getTransporter();

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
