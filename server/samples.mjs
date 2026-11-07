const FULL_MS = 2 * 3600_000; // keep every sample for 2 hours
const KEEP_MS = 24 * 3600_000; // then one per minute, for up to 24 hours

/** Add a sample and thin out old ones, so a coin's history stays a sensible size. */
export function addSample(list, t, mc) {
  const all = [...(list || []), { t, mc }];
  const fullFrom = t - FULL_MS;
  const out = [];
  let lastMinute = -1;
  for (const p of all) {
    if (p.t < t - KEEP_MS) continue;
    if (p.t >= fullFrom) out.push(p);
    else if (Math.floor(p.t / 60_000) !== lastMinute) {
      lastMinute = Math.floor(p.t / 60_000);
      out.push(p);
    }
  }
  return out;
}
