const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function money(value) {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return Number.isInteger(n) ? usd.format(n).replace('.00', '') : usd.format(n);
}

export function num(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
