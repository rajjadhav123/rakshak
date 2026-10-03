const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['case_verified', 'new_sighting', 'sighting_verified', 'status_update', 'nearby_alert', 'system'],
      required: true,
    },
    message: { type: String, required: true },
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
