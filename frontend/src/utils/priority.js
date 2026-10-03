// Client-side mirror of backend/utils/priority.js — used only for a
// live preview while filling out the form, so the officer/family sees
// the likely assessment before submitting. The backend recomputes this
// independently on save (never trusts a client-supplied value), so
// this file staying in sync is a nice-to-have for UX, not a security
// boundary.
export const suggestPriority = ({ age, lastSeenAt }) => {
  const reasons = [];
  let score = 0;

  const numericAge = Number(age);
  if (!Number.isNaN(numericAge) && age !== '') {
    if (numericAge <= 12) { score += 3; reasons.push('Child (12 or under)'); }
    else if (numericAge <= 17) { score += 2; reasons.push('Minor (13–17)'); }
    else if (numericAge >= 65) { score += 2; reasons.push('Senior (65+)'); }
  }

  if (lastSeenAt) {
    const hoursSince = (Date.now() - new Date(lastSeenAt).getTime()) / (1000 * 60 * 60);
    if (!Number.isNaN(hoursSince) && hoursSince >= 0) {
      if (hoursSince <= 6) { score += 2; reasons.push('Within 6 hours of last seen'); }
      else if (hoursSince <= 24) { score += 1; reasons.push('Within 24 hours of last seen'); }
    }
  }

  let priority = 'medium';
  if (score >= 4) priority = 'critical';
  else if (score >= 2) priority = 'high';
  else if (score === 0 && (age !== '' || lastSeenAt)) priority = 'low';

  return { priority, reasons };
};
