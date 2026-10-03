/**
 * Strict, shared validation for fields that were previously accepting
 * garbage input (e.g. a 4-digit "age", or free-text height with no
 * bounds at all). These return { ok, value, message } instead of
 * throwing, so each controller decides its own res.status() — keeps
 * this file framework-agnostic and easy to unit test later.
 */

const AGE_MIN = 0;
const AGE_MAX = 120;
const HEIGHT_MIN_INCHES = 10; // covers infants (missing-person cases can involve infants)
const HEIGHT_MAX_INCHES = 100; // generous upper bound, covers all realistic adult heights

const validateAge = (age) => {
  const n = Number(age);
  if (age === '' || age === undefined || age === null) {
    return { ok: false, message: 'Age is required' };
  }
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return { ok: false, message: 'Age must be a whole number' };
  }
  if (n < AGE_MIN || n > AGE_MAX) {
    return { ok: false, message: `Age must be between ${AGE_MIN} and ${AGE_MAX}` };
  }
  return { ok: true, value: n };
};

// Height is optional — an empty value is valid (field just isn't set).
const validateHeightInches = (height) => {
  if (height === undefined || height === null || height === '') {
    return { ok: true, value: undefined };
  }
  const n = Number(height);
  if (!Number.isFinite(n)) {
    return { ok: false, message: 'Height must be a number (in inches)' };
  }
  if (n < HEIGHT_MIN_INCHES || n > HEIGHT_MAX_INCHES) {
    return { ok: false, message: `Height must be between ${HEIGHT_MIN_INCHES} and ${HEIGHT_MAX_INCHES} inches` };
  }
  return { ok: true, value: n };
};

// A missing person can't have been "last seen" in the future — this
// previously wasn't checked at all, so a date like 2027 was silently
// accepted. Also rejects absurdly old dates (pre-1900) as almost
// certainly a data-entry mistake (e.g. typing the wrong century).
const validateLastSeenAt = (dateStr) => {
  if (!dateStr) return { ok: false, message: 'Last seen date/time is required' };
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return { ok: false, message: 'Last seen date/time is not a valid date' };
  if (d.getTime() > Date.now()) return { ok: false, message: 'Last seen date/time cannot be in the future' };
  if (d.getFullYear() < 1900) return { ok: false, message: 'Last seen date/time is implausibly old — please check the year' };
  return { ok: true, value: d };
};

module.exports = { validateAge, validateHeightInches, validateLastSeenAt, AGE_MIN, AGE_MAX, HEIGHT_MIN_INCHES, HEIGHT_MAX_INCHES };
