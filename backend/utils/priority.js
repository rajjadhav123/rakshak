/**
 * Suggests a case priority from a small set of transparent risk factors.
 * This is intentionally simple and explainable — every contributing
 * reason is returned alongside the result, so an officer reviewing it
 * can see exactly why the system suggested what it did (and override
 * it; this is a suggestion, not an automated decision).
 *
 * Factors used:
 *  - Age bracket (children and seniors are statistically higher-risk
 *    missing person cases)
 *  - Time elapsed since last seen (the first hours matter most in
 *    missing-person response — this mirrors real-world triage logic)
 *
 * Extend this — e.g. factoring in medical conditions, known risk areas,
 * repeat-case history — as your project's "intelligence" story grows.
 */
const suggestPriority = ({ age, lastSeenAt }) => {
  const reasons = [];
  let score = 0;

  const numericAge = Number(age);
  if (!Number.isNaN(numericAge)) {
    if (numericAge <= 12) {
      score += 3;
      reasons.push('Child (12 or under)');
    } else if (numericAge <= 17) {
      score += 2;
      reasons.push('Minor (13–17)');
    } else if (numericAge >= 65) {
      score += 2;
      reasons.push('Senior (65+)');
    }
  }

  const hoursSince = (Date.now() - new Date(lastSeenAt).getTime()) / (1000 * 60 * 60);
  if (!Number.isNaN(hoursSince) && hoursSince >= 0) {
    if (hoursSince <= 6) {
      score += 2;
      reasons.push('Reported within 6 hours of last seen');
    } else if (hoursSince <= 24) {
      score += 1;
      reasons.push('Reported within 24 hours of last seen');
    }
  }

  let priority = 'medium';
  if (score >= 4) priority = 'critical';
  else if (score >= 2) priority = 'high';
  else if (score === 0) priority = 'low';

  if (reasons.length === 0) reasons.push('No elevated risk factors detected from age or reporting time');

  return { priority, reasons, score };
};

module.exports = { suggestPriority };
