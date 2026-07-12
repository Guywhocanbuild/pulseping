// Simple inline-styled HTML templates — email clients don't support external
// stylesheets reliably, so everything is inlined. Kept minimal/table-free
// since modern clients (Gmail, Apple Mail, Outlook web) render this fine.

const baseWrapper = (innerHtml) => `
<div style="background:#0a0e14; padding: 40px 20px; font-family: -apple-system, Segoe UI, Helvetica, Arial, sans-serif;">
  <div style="max-width: 480px; margin: 0 auto; background:#131924; border:1px solid #232c3d; border-radius:10px; padding: 32px;">
    <div style="display:flex; align-items:center; gap:8px; margin-bottom: 24px;">
      <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:#3ddc97;"></span>
      <span style="color:#e8ecf3; font-weight:700; font-size:17px;">PulsePing</span>
    </div>
    ${innerHtml}
    <p style="color:#5c6b85; font-size:12px; margin-top: 32px;">
      You're receiving this because you have a PulsePing account. If this wasn't you, please secure your account immediately.
    </p>
  </div>
</div>
`;

const welcomeEmailTemplate = (name) =>
  baseWrapper(`
    <h2 style="color:#e8ecf3; font-size:20px; margin: 0 0 12px;">Welcome to PulsePing, ${name}.</h2>
    <p style="color:#a8b3c7; font-size:14px; line-height:1.6; margin: 0 0 16px;">
      Your account is ready. Add your first endpoint or server URL and PulsePing will start
      checking it on a real schedule — logging every response so you know the instant something
      goes down.
    </p>
    <a href="${process.env.CLIENT_URL || 'http://localhost:5000'}/dashboard.html"
       style="display:inline-block; background:#5b8def; color:#08101f; font-weight:600; font-size:14px; padding:10px 18px; border-radius:6px; text-decoration:none; margin-top: 8px;">
      Go to dashboard
    </a>
  `);

const loginAlertEmailTemplate = ({ name, time, ipAddress }) =>
  baseWrapper(`
    <h2 style="color:#e8ecf3; font-size:20px; margin: 0 0 12px;">New login to your account</h2>
    <p style="color:#a8b3c7; font-size:14px; line-height:1.6; margin: 0 0 16px;">
      Hi ${name}, a new login to your PulsePing account was just recorded.
    </p>
    <div style="background:#0e131b; border:1px solid #232c3d; border-radius:8px; padding:14px 16px; margin-bottom: 16px;">
      <p style="color:#5c6b85; font-size:12px; text-transform:uppercase; letter-spacing:0.04em; margin:0 0 4px;">Time</p>
      <p style="color:#e8ecf3; font-family: 'JetBrains Mono', monospace; font-size:13px; margin:0 0 12px;">${time}</p>
      <p style="color:#5c6b85; font-size:12px; text-transform:uppercase; letter-spacing:0.04em; margin:0 0 4px;">IP address</p>
      <p style="color:#e8ecf3; font-family: 'JetBrains Mono', monospace; font-size:13px; margin:0;">${ipAddress || 'Unknown'}</p>
    </div>
    <p style="color:#a8b3c7; font-size:13px; line-height:1.6; margin:0;">
      If this was you, no action is needed. If you don't recognize this login, change your password immediately.
    </p>
  `);

const passwordResetEmailTemplate = ({ name, resetUrl }) =>
  baseWrapper(`
    <h2 style="color:#e8ecf3; font-size:20px; margin: 0 0 12px;">Reset your password</h2>
    <p style="color:#a8b3c7; font-size:14px; line-height:1.6; margin: 0 0 16px;">
      Hi ${name}, we received a request to reset your PulsePing password. This link expires in 1 hour.
    </p>
    <a href="${resetUrl}"
       style="display:inline-block; background:#5b8def; color:#08101f; font-weight:600; font-size:14px; padding:10px 18px; border-radius:6px; text-decoration:none; margin-bottom: 16px;">
      Reset password
    </a>
    <p style="color:#5c6b85; font-size:12px; line-height:1.6; margin:0;">
      If you didn't request this, you can safely ignore this email — your password won't change.
    </p>
  `);

module.exports = { welcomeEmailTemplate, loginAlertEmailTemplate, passwordResetEmailTemplate };
