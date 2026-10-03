const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { ROLES } = require('../config/roles');
const { logAction } = require('../utils/audit');
const { findNearestStation } = require('../utils/findNearestStation');
const { notifyUser } = require('../utils/notify');
const { sendEmail } = require('../utils/sendEmail');

// @route POST /api/auth/register
// Public self-registration is only for Citizen / Family. Official roles
// (police_admin, district_control, etc.) are created by a senior admin
// via POST /api/users (see userController) and start pending_approval.
const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role, lat, lng, locality } = req.body;

  const publicRoles = [ROLES.CITIZEN, ROLES.FAMILY];
  const finalRole = publicRoles.includes(role) ? role : ROLES.CITIZEN;

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) {
    res.status(400);
    throw new Error('An account with this email already exists');
  }

  // Resolves "which area does this account belong to" the same way a
  // case's location determines its station — via real geo-distance to
  // the nearest known police jurisdiction, not a free-text field.
  // locality (e.g. "Virar") is the one piece that ISN'T re-derived
  // server-side — it's whatever the frontend already resolved, either
  // the exact name someone picked from the district/locality selector,
  // or a reverse-geocoded label for a raw GPS point. Trusted as
  // display text only; it never drives any jurisdiction logic, which
  // still runs entirely on the geo-derived district/state above.
  let homeLocation;
  if (lat && lng) {
    const nearestStation = await findNearestStation(lat, lng);
    homeLocation = {
      geo: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
      state: nearestStation?.state,
      district: nearestStation?.district,
      locality: typeof locality === 'string' ? locality.slice(0, 120) : undefined,
    };
  }

  const user = await User.create({ name, email, phone, password, role: finalRole, homeLocation });

  await logAction({ userId: user._id, action: 'USER_REGISTERED', targetType: 'User', targetId: user._id, req });

  res.status(201).json({
    success: true,
    user: user.toSafeObject(),
    token: generateToken(user._id),
  });
});

// @route POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email?.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }
  if (user.status === 'suspended') {
    res.status(403);
    throw new Error('Account suspended — contact an administrator');
  }

  user.lastLoginAt = new Date();

  // One-time nudge — the Dashboard banner and the sidebar badge stay
  // visible on every page for as long as enrollment is incomplete, so
  // this doesn't need to repeat on every login; it just makes sure the
  // very first login after this feature existed actually surfaces it.
  if (user.role === ROLES.POLICE_ADMIN && user.faceEnrollment?.status === 'not_enrolled' && !user.faceEnrollment?.reminderSentAt) {
    user.faceEnrollment.reminderSentAt = new Date();
    await notifyUser({
      userId: user._id,
      type: 'system',
      message: 'Your face recognition enrollment is pending \u2014 visit your District Control office, or complete it online under Face Enrollment.',
    });
  }

  await user.save();

  res.json({
    success: true,
    user: user.toSafeObject(),
    token: generateToken(user._id),
  });
});

// @route GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user.toSafeObject() });
});

// @route POST /api/auth/forgot-password
// Responds identically whether or not the email exists, and takes the
// same amount of work either way (no early return that skips the hash
// step) \u2014 a different reply for "no such account" vs "email sent" would
// let anyone enumerate registered emails one guess at a time. See
// middleware/rateLimit.js's forgotPasswordLimiter for the other half of
// this: capping how many guesses they get.
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() });

  if (user) {
    // Only a HASH of this is ever stored (models/User.js) \u2014 the raw
    // token exists only in this request and in the email it's about to
    // go out in, never in the database.
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${rawToken}`;
    await sendEmail({
      to: user.email,
      subject: 'Reset your Rakshak password',
      text: `You asked to reset your Rakshak password.\n\nThis link expires in 30 minutes and works once:\n${resetUrl}\n\nIf you didn't request this, you can ignore this email \u2014 your password won't change.`,
    });

    await logAction({ userId: user._id, action: 'PASSWORD_RESET_REQUESTED', targetType: 'User', targetId: user._id, req });
  }

  res.json({ success: true, message: 'If an account exists for that email, a reset link has been sent.' });
});

// @route POST /api/auth/reset-password/:token
const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password || password.length < 8) {
    res.status(400);
    throw new Error('Password must be at least 8 characters');
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetTokenHash +passwordResetExpires');

  if (!user) {
    res.status(400);
    throw new Error('This reset link is invalid or has expired \u2014 request a new one.');
  }

  user.password = password; // re-hashed by the pre('save') hook, same as registration
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  await logAction({ userId: user._id, action: 'PASSWORD_RESET_COMPLETED', targetType: 'User', targetId: user._id, req });

  res.json({ success: true, message: 'Password updated \u2014 you can now sign in.' });
});

module.exports = { register, login, getMe, forgotPassword, resetPassword };
