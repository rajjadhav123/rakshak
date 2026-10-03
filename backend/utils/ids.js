// A Mongoose ref field can arrive either as a raw ObjectId, or — once
// something upstream calls .populate() on it — as a full document
// instance. String() on those two produces completely different,
// never-equal output even when the underlying _id is identical:
// String(ObjectId) is the plain hex string, but String(populatedDoc)
// is a JSON-ish dump of its fields. This is exactly what silently
// broke Police Admin case visibility on GET /api/cases/:id (see
// utils/caseVisibility.js and the README's history) — the endpoint
// populated policeStationId to show its name, which made the
// station-match comparison fail unconditionally, for every officer,
// on every case, forever, with nothing about the data ever being
// wrong.
//
// getId()/idsEqual() exist so this exact class of bug can't quietly
// reappear at a new call site the next time someone adds a .populate()
// without remembering everywhere that field gets compared. Use
// idsEqual() for any comparison involving an ID that could plausibly
// arrive populated — which in a codebase using Mongoose refs is most
// of them.
const getId = (x) => (x && typeof x === 'object' && x._id !== undefined ? x._id : x);

const idsEqual = (a, b) => {
  if (a === null || a === undefined || b === null || b === undefined) return false;
  return String(getId(a)) === String(getId(b));
};

module.exports = { getId, idsEqual };
