const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../config/roles');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },

    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.CITIZEN,
      required: true,
    },

    // Jurisdiction scoping — mirrors the hierarchy so a District Control
    // Room account only ever sees its own district, etc.
    jurisdiction: {
      state: { type: String, trim: true },
      district: { type: String, trim: true },
      policeStationId: { type: mongoose.Schema.Types.ObjectId, ref: 'PoliceStation' },
    },

    // Only relevant for ngo_admin / ngo_volunteer
    ngo: {
      organizationName: { type: String, trim: true },
      registrationId: { type: String, trim: true },
      supervisorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // volunteer -> ngo_admin
      // Service area used to auto-involve this NGO when a sighting lands
      // nearby (ngo_admin only). Distance is computed with a simple
      // haversine check rather than a $near query, since each NGO has
      // its own radius (see utils/geo.js).
      serviceArea: {
        geo: {
          type: { type: String, enum: ['Point'] },
          coordinates: { type: [Number] }, // [lng, lat]
        },
        radiusKm: { type: Number, default: 25 },
      },
    },

    // Family/Citizen "home area" — captured as lat/lng at registration
    // (or later), then resolved to a district/state via the same
    // nearest-station lookup used for case routing. This answers "how
    // do we know which area this account belongs to" — Pune, Palghar,
    // Mumbai, etc. — the same way a case's location determines its
    // station, rather than a free-text field someone could mistype.
    homeLocation: {
      geo: {
        type: { type: String, enum: ['Point'] },
        coordinates: { type: [Number] }, // [lng, lat]
      },
      state: { type: String, trim: true },
      district: { type: String, trim: true },
      // The specific place within the district — e.g. "Virar", not
      // just "Palghar". Previously only district/state were stored,
      // so even picking an exact locality by name at registration
      // still only ever showed the coarser district afterward — this
      // is what that was actually missing, not a display bug alone.
      locality: { type: String, trim: true },
    },

    status: {
      type: String,
      enum: ['pending_approval', 'active', 'suspended'],
      // Official/authority roles require manual approval before they can act.
      default: function () {
        return [ROLES.CITIZEN, ROLES.FAMILY].includes(this.role) ? 'active' : 'pending_approval';
      },
    },

    // Exempts an account from rate-limit-style rules (e.g. the
    // once-per-30-days Emergency Report limit — see
    // controllers/caseController.js). ONLY the seeded demo family
    // account has this set. This is a deliberate, narrow testing
    // convenience, not a general permission — in a real deployment
    // this flag should never be set on a real user's account, since
    // the whole point of the rate limit is to discourage abuse.
    // Duty status — only meaningful for police_admin. Self-toggled by
    // the officer; shown to their District Control so they know who's
    // actually reachable right now, not just who's assigned to a
    // station on paper. Defaults true so seeded demo accounts show as
    // reachable immediately.
    onDuty: { type: Boolean, default: true },

    testAccount: { type: Boolean, default: false },

    // Biometric step-up auth for Police Admin's highest-stakes actions
    // (verifying a case, verifying a sighting) — see backend/utils/faceMatch.js
    // and controllers/faceController.js. Descriptors are 128-d face
    // embeddings (from face-api.js, computed client-side), NOT raw
    // images, for the reference set actually used to match against —
    // the 3 enrollment images are kept separately, only for a District
    // Control officer to visually confirm before approving.
    faceEnrollment: {
      status: { type: String, enum: ['not_enrolled', 'pending', 'enrolled', 'rejected'], default: 'not_enrolled' },
      images: [{ type: String }], // left/center/right, for DySP visual review — see file header
      descriptors: [{ type: [Number] }], // one 128-d array per enrolled angle
      submittedAt: { type: Date },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reviewedAt: { type: Date },
      rejectionReason: { type: String },
      // Consecutive failed match attempts (across ALL verification
      // methods — blink, head-turn, photo_match) since the last
      // successful one. Resets to 0 on any success. See
      // controllers/faceController.js: hitting the threshold there
      // sets status to 'suspended' automatically — already fully
      // enforced everywhere (middleware/auth.js, authController.js),
      // so this field doesn't need its own enforcement logic, only
      // something to increment and check.
      failedMatchAttempts: { type: Number, default: 0 },
      reminderSentAt: { type: Date }, // so the login nudge below only fires once
    },

    lastLoginAt: { type: Date },

    // Forgot-password flow (controllers/authController.js). Only ever
    // store a HASH of the reset token, the same principle as the
    // password field above — the raw token is emailed to the user and
    // never saved anywhere, so a database read alone (a leak or a
    // careless query) can't be turned into a working reset link the
    // way a stored raw token could be. select: false for the same
    // reason the password hash is: no route should ever accidentally
    // include it in a response just because it did a plain `find()`.
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  // The enrolled reference descriptors are what face verification
  // matches against — they must never leave the server. Everything
  // else about enrollment (status, the 3 review images, timestamps)
  // is fine for the account holder or their DySP to see.
  if (obj.faceEnrollment) delete obj.faceEnrollment.descriptors;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
