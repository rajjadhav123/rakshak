const mongoose = require('mongoose');

/**
 * A snapshot of a Case document taken immediately BEFORE an edit is
 * applied. To restore, we re-apply the snapshotted fields onto the
 * live Case and record a new "Restored" timeline entry + a fresh
 * snapshot of what it looked like right before the restore, so restore
 * itself is undoable too.
 */
const caseVersionSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true, index: true },
    snapshot: { type: mongoose.Schema.Types.Mixed, required: true }, // full case field set at that point in time
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    changeReason: { type: String }, // e.g. "Edited details", "Restored to v2"
  },
  { timestamps: true }
);

module.exports = mongoose.model('CaseVersion', caseVersionSchema);
