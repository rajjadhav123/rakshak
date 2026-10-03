const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

// There was NO rate limiting anywhere in this app before — meaning
// /api/auth/login had zero brute-force protection. That's a direct
// gap against the exact threat model the face-recognition feature
// was built for ("someone gets a Police Admin's credentials with
// malicious intent") — face verification defends what happens AFTER
// login; this defends the login itself. Keyed by IP + the attempted
// email together, not IP alone, so one flaky/shared-NAT IP genuinely
// hammering ONE account gets throttled without an office full of
// officers on the same network locking each other out.
//
// Uses the library's own ipKeyGenerator rather than raw string
// concatenation — a naive `req.ip` string has many equivalent textual
// forms for the same IPv6 address, so building a key by hand is
// trivially bypassable for IPv6 clients; ipKeyGenerator normalizes
// that correctly.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${(req.body?.email || '').toLowerCase()}`,
  message: { success: false, message: 'Too many login attempts \u2014 please wait 15 minutes and try again.' },
});

// A light general ceiling on the whole API — not aimed at any one
// endpoint, just a backstop against a runaway client or basic scripted
// abuse. Generous on purpose: this app polls notifications and this
// should never be what a genuine user hits.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// Same IP+email keying as loginLimiter, above, and for the same reason.
// Stricter (3, not 8) because triggering this sends an email — someone
// could otherwise use the endpoint to spam a real person's inbox with
// reset links even without any hope of actually breaking into the
// account.
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${(req.body?.email || '').toLowerCase()}`,
  message: { success: false, message: 'Too many reset requests \u2014 please wait 15 minutes and try again.' },
});

module.exports = { loginLimiter, apiLimiter, forgotPasswordLimiter };
