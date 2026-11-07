// Offline test of sample thinning. Run: node scripts/market-test.mjs
import assert from 'node:assert/strict';
import { addSample } from '../server/samples.mjs';
const H = 3600_000, now = 100 * H;
let list = [];
// a sample every 5 seconds for 5 hours
for (let t = now - 5 * H; t <= now; t += 5000) list = addSample(list, t, 1);
const full = list.filter((p) => p.t >= now - 2 * H).length;
const old = list.filter((p) => p.t < now - 2 * H);
assert.ok(full >= 1440 && full <= 1442, `full ${full}`);
assert.ok(old.length <= 181 && old.length >= 179, `old ${old.length}`); // one per minute for 3 hours
assert.ok(addSample([{ t: now - 25 * H, mc: 1 }], now, 2).length === 1); // older than 24h is dropped
console.log('market-test: ok');
