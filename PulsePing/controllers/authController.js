const crypto = require('crypto');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');
const { welcomeEmailTemplate, loginAlertEmailTemplate, passwordResetEmailTemplate } = require('../utils/emailTemplates');

// @route POST /api/auth/register
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);

    // Fire-and-forget: don't let a slow/broken mail provider delay or break registration
    sendEmail({
      to: user.email,
      subject: 'Welcome to PulsePing',
      html: welcomeEmailTemplate(user.name),
    }).catch((e) => console.error('[registerUser] welcome email failed:', e.message));

    res.status(201).json({ user: user.toSafeObject(), token });
  } catch (err) {
    console.error('[registerUser]', err.message);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// @route POST /api/auth/login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);

    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip;
    sendEmail({
      to: user.email,
      subject: 'New login to your PulsePing account',
      html: loginAlertEmailTemplate({
        name: user.name,
        time: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
        ipAddress,
      }),
    }).catch((e) => console.error('[loginUser] login alert email failed:', e.message));

    res.json({ user: user.toSafeObject(), token });
  } catch (err) {
    console.error('[loginUser]', err.message);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @route GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ user: req.user.toSafeObject ? req.user.toSafeObject() : req.user });
};

// @route POST /api/auth/forgot-password
// Always responds with the same generic message, whether or not the email exists —
// this prevents leaking which emails have accounts (a common enumeration attack).
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const genericResponse = { message: 'If an account exists for that email, a reset link has been sent.' };

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.json(genericResponse);

    // Generate a random token; store only its hash in the DB so a leaked DB
    // doesn't hand out working reset links.
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5000'}/reset-password.html?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    sendEmail({
      to: user.email,
      subject: 'Reset your PulsePing password',
      html: passwordResetEmailTemplate({ name: user.name, resetUrl }),
    }).catch((e) => console.error('[forgotPassword] reset email failed:', e.message));

    res.json(genericResponse);
  } catch (err) {
    console.error('[forgotPassword]', err.message);
    res.status(500).json({ message: 'Server error requesting password reset' });
  }
};

// @route POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) {
      return res.status(400).json({ message: 'Email, token and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+resetPasswordToken +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({ message: 'This reset link is invalid or has expired. Please request a new one.' });
    }

    user.password = newPassword; // pre-save hook hashes this
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (err) {
    console.error('[resetPassword]', err.message);
    res.status(500).json({ message: 'Server error resetting password' });
  }
};

// @route PUT /api/auth/change-password  (logged-in user)
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id); // req.user from `protect` has no password field — refetch it
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('[changePassword]', err.message);
    res.status(500).json({ message: 'Server error changing password' });
  }
};

module.exports = { registerUser, loginUser, getMe, forgotPassword, resetPassword, changePassword };
