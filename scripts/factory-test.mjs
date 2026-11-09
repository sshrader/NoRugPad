// Runs the Pawprint scene headlessly with a fake canvas. Run: node scripts/factory-test.mjs
import assert from 'node:assert/strict';
import { createFactory, FW } from '../src/lib/factory.ts';

function fakeContext() {
  const calls = { n: 0 };
  const grad = { addColorStop() {} };
  const target = { createLinearGradient: () => grad, createRadialGradient: () => grad, measureText: (t) => ({ width: String(t).length * 5 }) };
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
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

for (const count of [0, 1, 5, 30]) {
  const f = createFactory({ rand: seeded(count + 7) });
  f.setCoins(Array.from({ length: count }, (_, i) => ({ mint: `M${i}`, name: `Coin ${i}`, symbol: `c${i}`, image: null })));
  const g = fakeContext();
  let maxOnBelt = 0;
  for (let i = 0; i < 60 * 120; i++) {
    // also test a stutter: a long frame must not break anything
    f.update(i % 500 === 0 ? 0.1 : 1 / 60);
    f.draw(g);
    maxOnBelt = Math.max(maxOnBelt, f.stats().onBelt);
  }
  const s = f.stats();
  console.log(`${count} coins: made ${s.made}, most on belt ${maxOnBelt}, draw calls ${g.calls.n}`);
  assert.ok(s.made >= 60, 'the machine should keep making things');
  assert.ok(maxOnBelt <= 16, 'the belt should never overflow');
  assert.ok(maxOnBelt >= 4, 'the belt should look busy');
}

// a coin whose logo breaks must not stop the scene
const f = createFactory({ rand: seeded(1) });
f.setCoins([{ mint: 'X', name: 'X', symbol: 'x', image: { broken: true } }]);
const g = new Proxy(fakeContext(), {
  get(t, k) {
    if (k === 'drawImage') return () => { throw new Error('bad image'); };
    return t[k];
  },
});
for (let i = 0; i < 60 * 20; i++) { f.update(1 / 60); f.draw(g); }
assert.ok(FW > 0);
console.log('factory-test: ok');
