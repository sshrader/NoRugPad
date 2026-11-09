// Runs the Meme Factory Arena engine headlessly with a recording fake canvas: no browser, no network.
//   node scripts/rug-test.mjs
import assert from 'node:assert/strict';
import { createBattle, BW, BH } from '../src/lib/rugWorld.ts';
import { createField, FW, FH, MAX_DEFENDERS } from '../src/lib/rugField.ts';

// A canvas context that accepts any call and checks that coordinates are real numbers.
function fakeContext() {
  const calls = { n: 0 };
  const grad = { addColorStop() {} };
  const target = {
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
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

// ---------------------------------------------------------------------------------------------
// Meme Factory Field (the top-down arena on the Explore page)
const coin = (i) => ({ mint: `Mint${i}`.padEnd(44, 'x'), name: `Coin ${i}`, symbol: `C${i}`, image: null });
const coinsOf = (n, from = 0) => Array.from({ length: n }, (_, i) => coin(from + i));

for (const [label, n] of [['no coins', 0], ['one coin', 1], ['ten coins', 10], ['forty coins', 40], ['sixty (capped)', 60]]) {
  for (const seed of [11, 12, 13]) {
    const f = createField({ rand: seeded(seed) });
    f.setDefenders(coinsOf(n));
    const g = fakeContext();
    for (let i = 0; i < 60 * 120; i++) {
      f.update(1 / 60);
      f.draw(g);
      if (i % 300 === 0) {
        for (const p of f.positions()) {
          assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), 'defender position not finite');
          assert.ok(p.x > -6 && p.x < FW + 6 && p.y > -6 && p.y < FH + 6, `defender left the arena (${label})`);
        }
        for (const e of f.debugEnemies()) {
          assert.ok(Number.isFinite(e.x) && Number.isFinite(e.y), 'enemy position not finite');
          assert.ok(e.claims >= 0 && e.claims <= 4, 'enemy claims out of range');
        }
      }
    }
    const st = f.stats();
    assert.ok(st.vault >= 0 && st.vault <= 100 && st.meter >= 0 && st.meter <= 100, 'field vault or meter out of range');
    assert.ok(st.defenders <= MAX_DEFENDERS, 'too many defenders');
    if (n >= 10) {
      assert.ok(st.rugs + st.scams >= 5, `${label}: defenders should stop enemies`);
      assert.ok(st.top.length > 0 && st.top[0].kills > 0, `${label}: top defenders should be credited`);
    }
    if (seed === 11) console.log(`field ${label}: wave ${st.wave}, rugs ${st.rugs}, scams ${st.scams}, vault ${st.vault}%, defenders ${st.defenders}`);
  }
}

// Defenders never go after an enemy that has not yet walked into view: such an enemy must have no claim on it.
{
  const f = createField({ rand: seeded(21) });
  f.setDefenders(coinsOf(20));
  const g = fakeContext();
  const seen = new Set();
  let checked = 0;
  for (let i = 0; i < 60 * 60; i++) {
    f.update(1 / 60);
    f.draw(g);
    for (const e of f.debugEnemies()) {
      const inside = e.x > 6 && e.x < FW - 6 && e.y > 6 && e.y < FH - 6;
      if (inside) seen.add(e.id);
      else if (!seen.has(e.id)) {
        checked++;
        assert.equal(e.claims, 0, 'an enemy that was never in view was already claimed');
      }
    }
  }
  assert.ok(checked > 0, 'test never saw an enemy still outside the view');
  console.log(`field targeting: ${checked} samples of enemies not yet in view, none claimed`);
}

// No enemy may linger outside the view once it has been seen (unless it is running away), or waves could never clear.
for (const n of [3, 10, 25]) {
  for (const seed of [41, 42, 43, 44]) {
    const f = createField({ rand: seeded(seed) });
    f.setDefenders(coinsOf(n));
    const g = fakeContext();
    const outFor = new Map();
    let worst = 0;
    for (let i = 0; i < 60 * 150; i++) {
      f.update(1 / 60);
      f.draw(g);
      const alive = new Set();
      for (const e of f.debugEnemies()) {
        alive.add(e.id);
        const inside = e.x > 6 && e.x < FW - 6 && e.y > 6 && e.y < FH - 6;
        if (inside || e.state === 'flee' || e.state === 'dying') outFor.delete(e.id);
        else {
          const t0 = outFor.get(e.id) ?? i;
          outFor.set(e.id, t0);
          if (e.state !== 'walk') worst = Math.max(worst, (i - t0) / 60);
        }
      }
      for (const id of outFor.keys()) if (!alive.has(id)) outFor.delete(id);
    }
    assert.ok(worst < 6, `an enemy stayed outside the view for ${worst.toFixed(1)}s (${n} coins, seed ${seed})`);
    assert.ok(f.stats().wave >= 3, `waves should keep advancing (${n} coins, seed ${seed})`);
  }
}
console.log('field lingering enemies: none stuck outside the view (3, 10 and 25 coins, 4 seeds each)');

// The roster changes while the fight runs (new launches arrive, old ones leave).
{
  const f = createField({ rand: seeded(31) });
  const g = fakeContext();
  f.setDefenders(coinsOf(40));
  for (let i = 0; i < 60 * 40; i++) { f.update(1 / 60); f.draw(g); }
  f.setDefenders(coinsOf(10, 100));
  for (let i = 0; i < 60 * 30; i++) { f.update(1 / 60); f.draw(g); }
  f.setDefenders([]);
  for (let i = 0; i < 60 * 20; i++) { f.update(1 / 60); f.draw(g); }
  f.setDefenders(coinsOf(25, 5));
  for (let i = 0; i < 60 * 40; i++) { f.update(1 / 60); f.draw(g); }
  const st = f.stats();
  assert.equal(st.defenders, 25);
  for (const e of f.debugEnemies()) assert.ok(e.claims >= 0 && e.claims <= 4, 'claims out of range after roster changes');
  assert.equal(f.hitTest(-50, -50), null);
  const first = f.positions()[0];
  assert.equal(f.hitTest(first.x, first.y) !== null, true);
  console.log(`field roster changes: ok (${st.defenders} defenders, wave ${st.wave})`);
}

assert.equal(BW, 480);
assert.equal(BH, 272);
if (failures) {
  console.error(`${failures} run(s) failed`);
  process.exit(1);
}
console.log('rug-test: ok');
