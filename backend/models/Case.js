const mongoose = require('mongoose');

const timelineEventSchema = new mongoose.Schema(
  {
    label: { type: String, required: true }, // e.g. "Case Created", "Verified", "First Sighting"
    note: { type: String },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const caseSchema = new mongoose.Schema(
  {
    // --- Case entry form fields (Section 5, Architecture doc) ---
    fullName: { type: String, required: true, trim: true },
    // Bounds are enforced again in the controller with a clearer error
    // message before this ever runs — the schema-level check is
    // defense-in-depth, not the primary UX.
    age: { type: Number, required: true, min: 0, max: 120 },
    height: { type: Number, min: 10, max: 100 }, // inches — see utils/validators.js
    appearanceDescription: { type: String },
    photoUrl: { type: String },
    lastSeenLocation: {
      address: { type: String, required: true },
      // GeoJSON Point for 2dsphere queries: [longitude, latitude]
      geo: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true },
      },
    },
    lastSeenAt: { type: Date, required: true },
    firNumber: { type: String, trim: true }, // absent until an Emergency Report is upgraded
    familyContact: { type: String, required: true },

    // --- Case lifecycle ---
    status: {
      type: String,
      // pending_verification is kept in the enum for backward
      // compatibility with any pre-existing data, but no current
      // creation path (createCase, createEmergencyReport) ever sets
      // it — they explicitly set 'verified' or 'emergency_pending'.
      // The default below used to point at pending_verification,
      // which meant it was silently unreachable in normal use but
      // would become a real (and wrong) status the moment a future
      // code path created a Case without setting status explicitly.
      enum: ['emergency_pending', 'pending_verification', 'verified', 'under_search', 'found', 'closed'],
      default: 'emergency_pending',
    },
    isEmergencyReport: { type: Boolean, default: false }, // WORKFLOW-003 — pre-FIR, restricted visibility
    courtRestricted: { type: Boolean, default: false }, // hides sensitive fields from public feed

    // Required consent for Emergency Reports — the reporter affirms the
    // information is accurate and acknowledges that knowingly filing a
    // false report to a public servant is an offence under Section 217,
    // Bharatiya Nyaya Sanhita, 2023. This is a deterrent + accountability
    // record, not a technical fraud-prevention mechanism on its own —
    // see the README for the fuller discussion of that problem.
    declarationAccepted: { type: Boolean, default: false },
    declarationAcceptedAt: { type: Date },

    // --- Case assessment / triage ---
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
    },
    priorityReason: { type: String }, // human-readable explanation, auto-generated or manual
    priorityAutoSuggested: { type: Boolean, default: true }, // false once an officer manually overrides it

    // --- Ownership / jurisdiction ---
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    policeStationId: { type: mongoose.Schema.Types.ObjectId, ref: 'PoliceStation' },
    jurisdiction: {
      state: { type: String, trim: true },
      district: { type: String, trim: true },
    },

    // --- NGO / volunteer involvement (WORKFLOW: NGO coordination) ---
    // NGOs auto-linked when a sighting lands within their service area,
    // so an NGO Admin's dashboard can show "cases I'm involved in"
    // without relying purely on notifications.
    involvedNgos: [
      {
        ngoAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        organizationName: { type: String },
        linkedVia: { type: String, enum: ['sighting_proximity', 'manual', 'emergency_report', 'case_verified'], default: 'sighting_proximity' },
        linkedAt: { type: Date, default: Date.now },
      },
    ],
    assignedVolunteers: [
      {
        volunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        note: { type: String },
        assignedAt: { type: Date, default: Date.now },
      },
    ],

    timeline: [timelineEventSchema],

    // --- Family portal expansion ---
    // photoUrl above stays the primary photo (used in map markers,
    // list cards); this is ADDITIONAL photos a family adds over time.
    photos: [
      {
        url: { type: String, required: true },
        caption: { type: String },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    documents: [
      {
        url: { type: String, required: true },
        name: { type: String, required: true },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    // Free-text supplementary details a family adds after initial
    // filing — a distinguishing mark remembered later, a habit, a
    // place they might go. Kept as an append-only log (not editable
    // fields) so nothing already told to police can be silently
    // changed after the fact.
    additionalInfo: [
      {
        text: { type: String, required: true },
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

caseSchema.index({ 'lastSeenLocation.geo': '2dsphere' });
caseSchema.index({ status: 1 });
caseSchema.index({ priority: 1 });
caseSchema.index({ 'jurisdiction.state': 1, 'jurisdiction.district': 1 });

module.exports = mongoose.model('Case', caseSchema);
