const mongoose = require('mongoose');

const sightingSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    description: { type: String, required: true },
    location: {
      address: { type: String },
      geo: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true },
      },
    },
    evidenceUrls: [{ type: String }],
    seenAt: { type: Date, default: Date.now },

    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewNote: { type: String },
  },
  { timestamps: true }
);

sightingSchema.index({ 'location.geo': '2dsphere' });
sightingSchema.index({ caseId: 1, status: 1 });

module.exports = mongoose.model('Sighting', sightingSchema);
