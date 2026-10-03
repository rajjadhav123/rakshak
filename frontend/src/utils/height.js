// Height is stored and entered in inches (a plain number), but shown
// as feet'inches" for readability — e.g. 66 -> 5'6".
export const formatHeight = (inches) => {
  if (inches === undefined || inches === null || inches === '') return '—';
  const n = Number(inches);
  if (!Number.isFinite(n)) return '—';
  const feet = Math.floor(n / 12);
  const remainder = Math.round(n % 12);
  return `${feet}'${remainder}" (${n} in)`;
};
