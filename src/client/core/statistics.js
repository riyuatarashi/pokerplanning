/** Statistics helpers */
export function computeStats(votesMap) {
  const values = Object.values(votesMap).map(v => v.vote).filter(v => typeof v === 'number');
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = (values.reduce((s, v) => s + v, 0) / values.length).toFixed(1);
  return { min, max, avg, count: values.length };
}

