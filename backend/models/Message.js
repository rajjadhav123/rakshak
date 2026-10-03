const mongoose = require('mongoose');

// A direct message between exactly two users — currently only used
// for District Control <-> their own district's Police Admin. Kept
// flat (from/to/message) rather than a separate "thread" document,
// since a conversation is just "every message between these two
// people," which is a simple query either way.
//
// type: 'call_logged' entries live in the SAME collection as regular
// text — a DySP tapping Call (a tel: link, which the app can't verify
// actually connected) creates one of these instead of a real message.
// Interleaving them into one timeline is deliberate: "10:02 — DySP
// called you" then "10:05 — PSI: on my way" tells a coherent story a
// separate log never would, and — more importantly — a call_logged
// entry counts exactly the same as a text message for unlocking a
// Police Admin's reply (see controllers/messageController.js), which
// is what "call OR message" was always supposed to mean.
const messageSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['text', 'call_logged'], default: 'text' },
    message: { type: String, required: true, trim: true },
    // Set only for a case-scoped conversation (Family <-> the officer
    // handling their case) — unset for internal DySP<->PSI messages,
    // which aren't about any one case. Lets the same Message
    // collection serve both kinds of conversation without them
    // bleeding into each other: a thread is either "between these two
    // people" (caseId unset) or "between these two people, about this
    // case" (caseId set), never both interpretations of the same rows.
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case' },
  },
  { timestamps: true }
);

messageSchema.index({ from: 1, to: 1, createdAt: -1 });
messageSchema.index({ to: 1, from: 1, createdAt: -1 });
messageSchema.index({ caseId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
