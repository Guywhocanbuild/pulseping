const rateLimit = require('express-rate-limit');

// Login/register: slows down brute-force credential guessing.
// 10 attempts per 15 minutes per IP is generous for a real user, painful for a bot.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many attempts. Please try again in a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Forgot-password: stricter, since each hit sends an email — prevents someone
// from spamming a stranger's inbox with reset links.
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: 'Too many password reset requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, forgotPasswordLimiter };
