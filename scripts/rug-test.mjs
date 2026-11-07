// Runs the NoRugPad Arena engine headlessly with a recording fake canvas: no browser, no network.
//   node scripts/rug-test.mjs
import assert from 'node:assert/strict';
import { createBattle, BW, BH } from '../src/lib/rugWorld.ts';

// A canvas context that accepts any call and checks that coordinates are real numbers.
function fakeContext() {
  const calls = { n: 0 };
  const grad = { addColorStop() {} };
  const target = {
    createLinearGradient: () => grad,
    measureText: (t) => ({ width: String(t).length * 5 }),
  };
  return new Proxy(target, {
    get(t, k) {
      if (k === 'calls') return calls;
      if (k in t) return t[k];
      return (...args) => {
        calls.n++;
        for (const a of args) if (typeof a === 'number') assert.ok(Number.isFinite(a), `non-finite argument in ${String(k)}`);
      };
    },
    set() {
      return true;
    },
  });
}

// Seeded random so the run is repeatable.
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let failures = 0;
for (const seed of [1, 2, 3, 4, 5]) {
  const b = createBattle({ rand: seeded(seed) });
  b.setSkin({ name: 'Test', symbol: 'tst' });
  const g = fakeContext();
  let specials = 0;
  const frames = 60 * 150; // 150 seconds at 60 fps
  for (let i = 0; i < frames; i++) {
    b.update(1 / 60);
    b.draw(g);
    if (b.ready() && i % 7 === 0 && b.unleash()) specials++;
    const s = b.stats();
    assert.ok(s.vault >= 0 && s.vault <= s.vaultMax, 'vault out of range');
    assert.ok(s.heroHp >= 0 && s.heroHp <= 100, 'hero hp out of range');
    assert.ok(s.meter >= 0 && s.meter <= 100, 'meter out of range');
  }
  const s = b.stats();
  console.log(`seed ${seed}: wave ${s.wave}, rugs ${s.rugs}, scams ${s.scams}, vault ${s.vault}%, specials ${specials}, draw calls ${g.calls.n}`);
  try {
    assert.ok(s.wave >= 3, 'waves should advance');
    assert.ok(s.rugs + s.scams >= 5, 'the hero should stop enemies');
  } catch (e) {
    failures++;
    console.error('  FAIL:', e.message);
  }
}
assert.equal(BW, 480);
assert.equal(BH, 272);
if (failures) {
  console.error(`${failures} run(s) failed`);
  process.exit(1);
}
console.log('rug-test: ok');
