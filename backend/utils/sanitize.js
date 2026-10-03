// Defense against NoSQL injection via query-string bracket notation.
//
// Express's default 'extended' query parser (the `qs` library) turns
// ?district[$ne]=null into req.query.district = { $ne: 'null' } — an
// OBJECT, not a string. Any controller that then does
// `filter['jurisdiction.district'] = district` without checking the
// type hands that object straight to MongoDB, which reads it as a
// real query operator. That silently defeats whatever the filter was
// supposed to restrict — e.g. a Citizen account scoped to their own
// district could see every district's cases with a crafted query
// string, no exploit tooling required, just a browser address bar.
//
// The fix is the same everywhere this pattern occurs: confirm a query
// param is actually a plain string before it ever reaches a Mongo
// filter. Reject anything else outright rather than trying to coerce
// it — an object here is never a legitimate value, only an attempt
// (deliberate or accidental) to smuggle an operator in.
const asSafeString = (value) => (typeof value === 'string' && value.length > 0 ? value : undefined);

module.exports = { asSafeString };
