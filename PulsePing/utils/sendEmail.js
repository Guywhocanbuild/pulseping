const axios = require('axios');

/**
 * Sends email via Resend's HTTPS API instead of raw SMTP — Railway (and many
 * cloud hosts) block outbound SMTP ports to prevent spam, but HTTPS (443) is
 * never blocked. Resend's free tier is generous for a hobby project.
 *
 * Note: without a verified custom domain on Resend, emails can only be sent
 * FROM "onboarding@resend.dev" TO the email address you signed up with.
 * Verify a domain on Resend later to send to any recipient.
 */
const sendEmail = async ({ to, subject, html }) => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn(`[mailer] RESEND_API_KEY not set — skipping email "${subject}" to ${to}`);
    return { skipped: true };
  }

  try {
    await axios.post(
      'https://api.resend.com/emails',
      {
        from: process.env.EMAIL_FROM || 'PulsePing <onboarding@resend.dev>',
        to,
        subject,
        html,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return { sent: true };
  } catch (err) {
    const message = err.response?.data?.message || err.message;
    console.error(`[mailer] Failed to send "${subject}" to ${to}:`, message);
    return { sent: false, error: message };
  }
};

module.exports = sendEmail;
