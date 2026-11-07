// NoRugPad Field: a top-down arena on the Explore page. Every recent coin's logo is a defender standing in rings
// around the liquidity vault. Cartoon rug pullers, scammers and bots march in from the edges and the logos fight them off.
// Pure canvas code with no React, so it can be tested on its own (scripts/rug-test.mjs).
// It is a show only: strength has nothing to do with a coin's real safety. The villains are made-up characters.

export const FW = 480;
export const FH = 272;
export const SCALE = 2; // the canvas is drawn at 2x so text and edges stay sharp when it is scaled to fit the page
const UI_FONT = "'IBM Plex Sans', system-ui, sans-serif";
const CX = FW / 2;
const CY = FH / 2;
export const MAX_DEFENDERS = 40;
const RINGS = [
  { cap: 8, r: 34 },
  { cap: 14, r: 56 },
  { cap: 18, r: 78 },
];
const R = 10; // defender radius
const MARGIN = 6; // enemies count as "in view" once this far inside the edges

export type FieldCoin = { mint: string; name: string; symbol: string; image?: CanvasImageSource | null };
export type FieldStats = {
  wave: number;
  rugs: number;
  scams: number;
  vault: number;
  meter: number;
  defenders: number;
  banner: { text: string; color: string } | null;
  top: { mint: string; name: string; symbol: string; kills: number }[];
};

type Kind = 'rugger' | 'scammer' | 'bot' | 'boss';
type EState = 'walk' | 'pull' | 'aim' | 'flee' | 'dying';
type Enemy = {
  id: number;
  kind: Kind;
  x: number;
  y: number;
  hp: number;
  max: number;
  t: number;
  st: number;
  state: EState;
  speed: number;
  stand: number;
  cool: number;
  hurt: number;
  kx: number;
  ky: number;
  claims: number;
  seen: boolean; // has been in view at least once
  by: string;
  say: string;
  sayT: number;
};
type Def = {
  mint: string;
  name: string;
  symbol: string;
  image: CanvasImageSource | null;
  x: number;
  y: number;
  px: number; // post
  py: number;
  state: 'idle' | 'dash' | 'back';
  target: number;
  cool: number;
  kills: number;
  spin: number;
  phase: number;
  flash: number;
  slash: number;
  face: number;
};
type Shot = { x: number; y: number; vx: number; vy: number; back: boolean; life: number; by: string };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; coin: boolean };
type Floater = { x: number; y: number; text: string; life: number; color: string };
type Ring = { r: number; max: number; hit: Set<number> };

const RUGGER_SAY = ['Just a little rug...', 'Liquidity is mine!', 'Trust me, bro.', 'Nobody will notice.'];
const SCAM_SAY = ['FREE AIRDROP!', 'DM me for support!', 'Guaranteed 100x!', 'Verify your wallet!', 'Send SOL first.'];
const BOT_SAY = ['bzzt. sniping.', 'beep. bundling.'];
const DEAD_SAY = ['Rekt...', 'LP is locked?!', 'Noooo!', 'Blocked.', 'I should have audited.'];
const DEF_SAY = ['NO RUG!', 'Not today.', 'Rug denied.', 'LP locked!', 'Nice try.'];

export function createField(opts: { rand?: () => number } = {}) {
  const rand = opts.rand ?? Math.random;
  const rr = (a: number, b: number) => a + (b - a) * rand();
  const pick = <T>(a: T[]): T => a[Math.floor(rand() * a.length) % a.length];

  let time = 0;
  let nextId = 1;
  let defs: Def[] = [];
  let enemies: Enemy[] = [];
  let shots: Shot[] = [];
  let parts: Particle[] = [];
  let floats: Floater[] = [];
  let rings: Ring[] = [];
  let vault = 100;
  let meter = 0;
  let rugs = 0;
  let scams = 0;
  let shake = 0;
  let hitstop = 0;
  const wave = { n: 0, left: 0, spawnT: 0, clearT: 0, cleared: false };
  const banner = { text: '', t: 0, color: '#ffffff' };

  // Decorative ground specks, from a tiny fixed generator so they never change between frames.
  let seed = 98765;
  const lcg = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const specks = Array.from({ length: 70 }, () => ({ x: lcg() * FW, y: lcg() * FH, w: 1 + Math.floor(lcg() * 3), p: lcg() * 6 }));

  /* ------------------------------ helpers ------------------------------ */

  const float = (x: number, y: number, text: string, color = '#ffffff') => floats.push({ x, y, text, life: 1.1, color });
  const burst = (x: number, y: number, n: number, colors: string[], coin = false, power = 80) => {
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2;
      const sp = rr(0.3, 1) * power;
      parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rr(0.35, 0.8), max: 0.8, color: pick(colors), size: coin ? 2.5 : rr(1.5, 2.5), coin });
    }
  };
  const showBanner = (text: string, color = '#ffffff', secs = 1.8) => {
    banner.text = text;
    banner.t = secs;
    banner.color = color;
  };
  const inView = (e: { x: number; y: number }) => e.x > MARGIN && e.x < FW - MARGIN && e.y > MARGIN && e.y < FH - MARGIN;
  const hpMul = () => 1 + defs.length / 24;

  function layoutPosts() {
    const n = defs.length;
    let start = 0;
    RINGS.forEach((ring, ri) => {
      const count = Math.max(0, Math.min(ring.cap, n - start));
      for (let k = 0; k < count; k++) {
        const d = defs[start + k];
        const a = (k / count) * Math.PI * 2 - Math.PI / 2 + ri * 0.45;
        d.px = CX + Math.cos(a) * ring.r;
        d.py = CY + Math.sin(a) * ring.r;
      }
      start += count;
    });
  }

  function setDefenders(list: FieldCoin[]) {
    const old = new Map(defs.map((d) => [d.mint, d]));
    const next: Def[] = [];
    for (const c of list.slice(0, MAX_DEFENDERS)) {
      const have = old.get(c.mint);
      if (have) {
        have.name = c.name;
        have.symbol = c.symbol;
        have.image = c.image ?? null;
        next.push(have);
        old.delete(c.mint);
      } else {
        next.push({
          mint: c.mint,
          name: c.name,
          symbol: c.symbol,
          image: c.image ?? null,
          x: CX,
          y: CY,
          px: CX,
          py: CY,
          state: 'idle',
          target: 0,
          cool: rr(0.2, 1.2),
          kills: 0,
          spin: 0,
          phase: rr(0, 6),
          flash: 1,
          slash: 0,
          face: 0,
        });
      }
    }
    // Defenders that left the list give up their claim on an enemy.
    for (const gone of old.values()) {
      const e = enemies.find((x) => x.id === gone.target);
      if (e && e.claims > 0) e.claims--;
    }
    defs = next;
    layoutPosts();
  }

  /* ------------------------------ waves ------------------------------ */

  function spawnPoint() {
    const side = Math.floor(rand() * 4) % 4;
    if (side === 0) return { x: rr(10, FW - 10), y: -10 };
    if (side === 1) return { x: FW + 10, y: rr(10, FH - 10) };
    if (side === 2) return { x: rr(10, FW - 10), y: FH + 10 };
    return { x: -10, y: rr(10, FH - 10) };
  }

  function spawn(kind: Kind) {
    const p = spawnPoint();
    const m = hpMul();
    const hp = kind === 'rugger' ? (30 + wave.n * 2) * m : kind === 'scammer' ? (26 + wave.n * 2) * m : kind === 'bot' ? 12 * m : (150 + wave.n * 14) * m;
    const speed = kind === 'rugger' ? Math.min(44, 22 + wave.n * 1.5) : kind === 'scammer' ? 24 : kind === 'bot' ? 56 : 12;
    const e: Enemy = {
      id: nextId++,
      kind,
      x: p.x,
      y: p.y,
      hp,
      max: hp,
      t: rr(0, 6),
      st: 0,
      state: 'walk',
      speed,
      stand: rr(85, 115), // well inside the arena, which is only 136 tall from the centre to an edge
      cool: kind === 'boss' ? 2.6 : rr(0.8, 1.8),
      hurt: 0,
      kx: 0,
      ky: 0,
      claims: 0,
      seen: false,
      by: '',
      say: '',
      sayT: 0,
    };
    if (rand() < 0.3) {
      e.say = kind === 'scammer' ? pick(SCAM_SAY) : kind === 'bot' ? pick(BOT_SAY) : pick(RUGGER_SAY);
      e.sayT = 2;
    }
    enemies.push(e);
  }

  function startWave() {
    wave.n++;
    wave.cleared = false;
    const boss = wave.n % 4 === 0;
    wave.left = Math.min(22, 3 + wave.n + Math.floor(defs.length / 3)) - (boss ? 2 : 0);
    wave.spawnT = 0.6;
    if (boss) {
      showBanner(`WAVE ${wave.n}: MEGA RUGGER!`, '#ff6b7a', 2.4);
      spawn('boss');
    } else {
      showBanner(`WAVE ${wave.n}`, '#b5a9ff');
    }
  }

  /* ------------------------------ combat ------------------------------ */

  function kill(e: Enemy) {
    e.state = 'dying';
    e.st = 0.5;
    e.hp = 0;
    const credit = defs.find((d) => d.mint === e.by);
    if (credit) credit.kills++;
    if (e.kind === 'rugger' || e.kind === 'boss') {
      rugs++;
      float(e.x, e.y - 16, e.kind === 'boss' ? 'BOSS DOWN!' : 'RUG STOPPED', '#5eddb4');
    } else {
      scams++;
      float(e.x, e.y - 16, e.kind === 'scammer' ? 'SCAM BLOCKED' : 'BOT SMASHED', '#5eddb4');
    }
    meter = Math.min(100, meter + 6);
    shake = Math.max(shake, e.kind === 'boss' ? 8 : 3);
    burst(e.x, e.y, e.kind === 'boss' ? 30 : 12, ['#ffd36b', '#fff6c8', '#ff6b7a'], true, 100);
    if (rand() < 0.5) {
      e.say = pick(DEAD_SAY);
      e.sayT = 0.7;
    }
    if (credit && rand() < 0.3) float(credit.x, credit.y - 18, pick(DEF_SAY), '#ffd36b');
    if (e.kind === 'boss') showBanner('MEGA RUGGER DOWN!', '#5eddb4', 2.2);
  }

  function damage(e: Enemy, dmg: number, kx: number, ky: number, by: string) {
    if (e.state === 'dying') return;
    e.hp -= dmg;
    e.hurt = 0.2;
    const k = e.kind === 'boss' ? 0.2 : 1;
    e.kx = kx * k;
    e.ky = ky * k;
    if (by) e.by = by;
    float(e.x, e.y - 12, String(Math.round(dmg)), '#ffd36b');
    burst(e.x, e.y, 6, ['#ffffff', '#ffd36b', '#b5a9ff']);
    shake = Math.max(shake, 2);
    hitstop = 0.03;
    meter = Math.min(100, meter + 2);
    if (e.hp <= 0) kill(e);
  }

  function chooseTarget(d: Def): Enemy | null {
    let best: Enemy | null = null;
    let bs = 1e9;
    for (const e of enemies) {
      if (e.state === 'dying' || e.state === 'flee') continue;
      if (!inView(e)) continue; // wait until it has walked into view
      if (e.claims >= (e.kind === 'boss' ? 4 : 1)) continue;
      let s = Math.hypot(e.x - CX, e.y - CY) + Math.hypot(e.x - d.x, e.y - d.y) * 0.6;
      if (e.state === 'pull') s -= 200;
      if (e.kind === 'scammer') s -= 30;
      if (s < bs) {
        bs = s;
        best = e;
      }
    }
    return best;
  }

  function release(d: Def) {
    const e = enemies.find((x) => x.id === d.target);
    if (e && e.claims > 0) e.claims--;
    d.target = 0;
  }

  /* ------------------------------ update ------------------------------ */

  function update(rawDt: number) {
    let dt = Math.min(0.1, Math.max(0, rawDt));
    if (hitstop > 0) {
      hitstop -= dt;
      dt *= 0.15;
    }
    time += dt;
    shake = Math.max(0, shake - dt * 20);
    banner.t -= dt;

    // waves
    if (wave.n === 0) startWave();
    wave.spawnT -= dt;
    const cap = Math.min(16, 6 + Math.floor(defs.length / 3));
    if (wave.left > 0 && wave.spawnT <= 0 && enemies.length < cap) {
      const r = rand();
      spawn(r < 0.5 ? 'rugger' : r < 0.8 ? 'scammer' : 'bot');
      wave.left--;
      wave.spawnT = rr(0.7, 1.6);
    }
    if (wave.left === 0 && enemies.length === 0) {
      if (!wave.cleared) {
        wave.cleared = true;
        wave.clearT = 2;
        showBanner('WAVE CLEARED', '#5eddb4', 1.8);
        vault = Math.min(100, vault + 15);
      }
      wave.clearT -= dt;
      if (wave.clearT <= 0) startWave();
    }

    // vault
    vault = Math.min(100, vault + 1.2 * dt);
    if (vault <= 0) {
      vault = 40;
      meter = 100;
      showBanner('LIQUIDITY SAVED AT THE LAST SECOND', '#ffd36b', 2.2);
      for (const e of enemies) if (e.state !== 'dying') e.state = 'flee';
    }

    // defenders
    let dashers = 0;
    for (const d of defs) if (d.state === 'dash') dashers++;
    const maxDash = Math.ceil(defs.length * 0.5) + 1;
    for (const d of defs) {
      d.flash = Math.max(0, d.flash - dt * 1.5);
      d.slash = Math.max(0, d.slash - dt);
      d.cool -= dt;
      if (d.state === 'idle') {
        d.spin *= Math.max(0, 1 - dt * 8);
        const bx = d.px + Math.cos(time * 1.6 + d.phase) * 1.2;
        const by = d.py + Math.sin(time * 2 + d.phase) * 1.2;
        d.x += (bx - d.x) * Math.min(1, dt * 6);
        d.y += (by - d.y) * Math.min(1, dt * 6);
        if (d.cool <= 0 && dashers < maxDash) {
          const t = chooseTarget(d);
          if (t) {
            t.claims++;
            d.target = t.id;
            d.state = 'dash';
            dashers++;
          }
        }
      } else if (d.state === 'dash') {
        const t = enemies.find((e) => e.id === d.target && e.state !== 'dying' && e.state !== 'flee' && e.x > -4 && e.x < FW + 4 && e.y > -4 && e.y < FH + 4);
        if (!t) {
          release(d);
          d.state = 'back';
        } else {
          const dx = t.x - d.x;
          const dy = t.y - d.y;
          const dist = Math.hypot(dx, dy) || 1;
          d.face = Math.atan2(dy, dx);
          d.spin += dt * 18;
          const step = Math.min(dist, 250 * dt);
          d.x += (dx / dist) * step;
          d.y += (dy / dist) * step;
          if (dist <= R + 4) {
            d.slash = 0.22;
            damage(t, 14, (dx / dist) * 120, (dy / dist) * 120, d.mint);
            release(d);
            d.state = 'back';
            d.cool = rr(0.5, 1.2);
          }
        }
      } else {
        const dx = d.px - d.x;
        const dy = d.py - d.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 2) {
          d.state = 'idle';
        } else {
          const step = Math.min(dist, 200 * dt);
          d.x += (dx / dist) * step;
          d.y += (dy / dist) * step;
          d.spin *= Math.max(0, 1 - dt * 6);
        }
      }
    }
    // The shockwave fires on its own once the meter is full and a crowd is in view.
    if (meter >= 100 && enemies.filter((e) => e.state !== 'dying' && e.state !== 'flee' && inView(e)).length >= 3) unleash();

    // enemies
    for (const e of enemies) {
      e.t += dt;
      e.hurt = Math.max(0, e.hurt - dt);
      e.sayT -= dt;
      if (e.kx || e.ky) {
        e.x += e.kx * dt;
        e.y += e.ky * dt;
        const decay = Math.max(0, 1 - dt * 6);
        e.kx *= decay;
        e.ky *= decay;
        if (Math.abs(e.kx) + Math.abs(e.ky) < 4) e.kx = e.ky = 0;
      }
      if (e.state === 'dying') {
        e.st -= dt;
        continue;
      }
      // Once an enemy has walked into view, knockback can never push it back out (it would be unreachable).
      if (e.state !== 'flee') {
        if (inView(e)) e.seen = true;
        else if (e.seen) {
          e.x = Math.max(MARGIN + 1, Math.min(FW - MARGIN - 1, e.x));
          e.y = Math.max(MARGIN + 1, Math.min(FH - MARGIN - 1, e.y));
        }
      }
      const dx = CX - e.x;
      const dy = CY - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (e.state === 'walk') {
        if (e.kind === 'scammer') {
          if (dist <= e.stand && inView(e)) e.state = 'aim';
        } else {
          const reach = e.kind === 'boss' ? 40 : e.kind === 'bot' ? 22 : 26;
          if (dist <= reach) {
            e.state = 'pull';
            e.st = e.kind === 'boss' ? 3.6 : 1.9;
            if (e.kind === 'rugger') {
              e.say = pick(RUGGER_SAY);
              e.sayT = 1.6;
            }
          }
        }
        if (e.state === 'walk') {
          e.x += (dx / dist) * e.speed * dt;
          e.y += (dy / dist) * e.speed * dt;
        }
      } else if (e.state === 'pull') {
        if (e.kind === 'bot') {
          vault -= 2.6 * dt;
        } else {
          e.st -= dt;
          if (e.st <= 0) {
            const amt = e.kind === 'boss' ? 35 : 14;
            vault -= amt;
            float(CX, CY - 22, `-${amt} LP`, '#ff6b7a');
            e.say = 'RUG!';
            e.sayT = 1.2;
            shake = Math.max(shake, 5);
            burst(CX, CY, 14, ['#ffd36b', '#ff6b7a'], true, 100);
            e.state = 'flee';
          }
        }
      } else if (e.state === 'aim') {
        if (dist > e.stand + 8) {
          e.state = 'walk'; // knocked out of range: walk back in
          continue;
        }
        e.cool -= dt;
        if (e.cool <= 0) {
          e.cool = rr(1.8, 2.8);
          const sp = 90 + wave.n * 2;
          shots.push({ x: e.x, y: e.y, vx: (dx / dist) * sp, vy: (dy / dist) * sp, back: false, life: 5, by: '' });
          if (rand() < 0.3) {
            e.say = pick(SCAM_SAY);
            e.sayT = 1.6;
          }
        }
      } else if (e.state === 'flee') {
        e.x -= (dx / dist) * 95 * dt;
        e.y -= (dy / dist) * 95 * dt;
      }
    }
    enemies = enemies.filter((e) => {
      if (e.state === 'dying') return e.st > 0;
      if (e.state === 'flee') return e.x > -40 && e.x < FW + 40 && e.y > -40 && e.y < FH + 40;
      return true;
    });

    // scam links
    for (const s of shots) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      if (!s.back) {
        for (const d of defs) {
          if (Math.hypot(s.x - d.x, s.y - d.y) < R + 3 && (d.state === 'dash' || rand() < 0.6)) {
            s.back = true;
            s.vx *= -1.5;
            s.vy *= -1.5;
            s.by = d.mint;
            d.flash = 0.6;
            float(d.x, d.y - 14, 'DEFLECT!', '#8bd0ff');
            burst(s.x, s.y, 6, ['#8bd0ff', '#ffffff']);
            break;
          }
        }
        if (!s.back && Math.hypot(s.x - CX, s.y - CY) < 14) {
          s.life = 0;
          vault -= 4;
          float(CX, CY - 22, 'PHISHED -4', '#ff6b7a');
        }
      } else {
        for (const e of enemies) {
          if (e.state === 'dying' || e.state === 'flee') continue;
          if (Math.hypot(s.x - e.x, s.y - e.y) < 10) {
            s.life = 0;
            damage(e, 22, s.vx * 0.1, s.vy * 0.1, s.by);
            break;
          }
        }
      }
    }
    shots = shots.filter((s) => s.life > 0 && s.x > -20 && s.x < FW + 20 && s.y > -20 && s.y < FH + 20);

    // shockwave
    for (const r of rings) {
      r.r += 280 * dt;
      for (const e of enemies) {
        if (e.state === 'dying' || r.hit.has(e.id)) continue;
        if (Math.hypot(e.x - CX, e.y - CY) <= r.r) {
          r.hit.add(e.id);
          const dx = e.x - CX;
          const dy = e.y - CY;
          const dist = Math.hypot(dx, dy) || 1;
          damage(e, 40, (dx / dist) * 200, (dy / dist) * 200, '');
        }
      }
      for (const s of shots) if (!s.back && Math.hypot(s.x - CX, s.y - CY) <= r.r) s.life = 0;
    }
    rings = rings.filter((r) => r.r < r.max);

    for (const p of parts) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.max(0, 1 - dt * 2);
      p.vy *= Math.max(0, 1 - dt * 2);
    }
    parts = parts.filter((p) => p.life > 0);
    for (const f of floats) {
      f.life -= dt;
      f.y -= 14 * dt;
    }
    floats = floats.filter((f) => f.life > 0);
  }

  function unleash(): boolean {
    if (meter < 100) return false;
    meter = 0;
    rings.push({ r: 0, max: 330, hit: new Set() });
    shake = 8;
    showBanner('DIAMOND HANDS!', '#b5a9ff', 1.4);
    burst(CX, CY, 24, ['#b5a9ff', '#ffffff', '#ffd36b'], false, 140);
    return true;
  }

  /* ------------------------------ drawing ------------------------------ */

  const px = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) => {
    g.fillStyle = c;
    g.fillRect(Math.round(x), Math.round(y), w, h);
  };
  const circle = (g: CanvasRenderingContext2D, x: number, y: number, r: number, c: string) => {
    g.fillStyle = c;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  };
  const shadow = (g: CanvasRenderingContext2D, x: number, y: number, rx: number) => {
    g.globalAlpha = 0.3;
    g.fillStyle = '#000';
    g.beginPath();
    g.ellipse(x + 1, y + rx * 0.7, rx, rx * 0.45, 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
  };

  function drawGround(g: CanvasRenderingContext2D) {
    const bg = g.createLinearGradient(0, 0, 0, FH);
    bg.addColorStop(0, '#1b1442');
    bg.addColorStop(1, '#120e2b');
    g.fillStyle = bg;
    g.fillRect(0, 0, FW, FH);
    g.strokeStyle = 'rgba(139,123,255,0.10)';
    g.lineWidth = 1;
    for (let x = 0; x <= FW; x += 32) {
      g.beginPath();
      g.moveTo(x + 0.5, 0);
      g.lineTo(x + 0.5, FH);
      g.stroke();
    }
    for (let y = 0; y <= FH; y += 32) {
      g.beginPath();
      g.moveTo(0, y + 0.5);
      g.lineTo(FW, y + 0.5);
      g.stroke();
    }
    for (const s of specks) {
      g.globalAlpha = 0.25 + 0.2 * Math.sin(time * 1.5 + s.p);
      px(g, s.x, s.y, s.w, 1, '#8b7bff');
    }
    g.globalAlpha = 1;
    // rings the defenders stand on, and the danger zone
    g.strokeStyle = 'rgba(181,169,255,0.16)';
    for (const r of RINGS) {
      g.beginPath();
      g.arc(CX, CY, r.r, 0, Math.PI * 2);
      g.stroke();
    }
    g.setLineDash([3, 5]);
    g.strokeStyle = 'rgba(255,107,122,0.18)';
    g.beginPath();
    g.arc(CX, CY, 125, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
  }

  function drawVault(g: CanvasRenderingContext2D) {
    const ratio = Math.max(0, vault) / 100;
    const low = ratio < 0.3;
    g.globalAlpha = 0.25 + 0.15 * Math.sin(time * 3) + (low ? 0.2 : 0);
    circle(g, CX, CY, 24, low ? '#ff6b7a' : '#8b7bff');
    g.globalAlpha = 1;
    circle(g, CX, CY, 15, '#2d3a5e');
    g.lineWidth = 3;
    g.strokeStyle = '#ffd36b';
    g.beginPath();
    g.arc(CX, CY, 15, 0, Math.PI * 2);
    g.stroke();
    circle(g, CX, CY, 8, '#ffd36b');
    g.fillStyle = '#2d3a5e';
    g.font = `700 10px ${UI_FONT}`;
    g.textAlign = 'center';
    g.fillText('LP', CX, CY + 3);
    px(g, CX - 20, CY + 20, 40, 5, '#0c1315');
    px(g, CX - 19, CY + 21, Math.round(38 * ratio), 3, low ? '#ff6b7a' : '#5eddb4');
  }

  function drawDef(g: CanvasRenderingContext2D, d: Def) {
    shadow(g, d.x, d.y, R);
    if (d.state === 'dash') {
      for (let k = 1; k <= 2; k++) {
        g.globalAlpha = 0.18 / k;
        circle(g, d.x - Math.cos(d.face) * k * 7, d.y - Math.sin(d.face) * k * 7, R, '#b5a9ff');
      }
      g.globalAlpha = 1;
    }
    g.save();
    g.translate(d.x, d.y);
    g.rotate(d.spin);
    g.beginPath();
    g.arc(0, 0, R, 0, Math.PI * 2);
    g.save();
    g.clip();
    const im = d.image;
    const ready = !!im && (typeof HTMLImageElement === 'undefined' || !(im instanceof HTMLImageElement) || (im.complete && im.naturalWidth > 0));
    if (im && ready) {
      g.drawImage(im, -R, -R, R * 2, R * 2);
    } else {
      g.fillStyle = '#ffd36b';
      g.fillRect(-R, -R, R * 2, R * 2);
    }
    g.restore();
    g.restore();
    if (!(d.image && ready0(d.image))) {
      g.fillStyle = '#b8862b';
      g.font = 'bold 10px monospace';
      g.textAlign = 'center';
      g.fillText((d.symbol || '$').slice(0, 1).toUpperCase(), d.x, d.y + 3.5);
    }
    g.lineWidth = 2;
    g.strokeStyle = d.flash > 0 ? '#ffffff' : '#ffd36b';
    g.beginPath();
    g.arc(d.x, d.y, R + 0.5, 0, Math.PI * 2);
    g.stroke();
    if (d.flash > 0) {
      g.globalAlpha = Math.min(1, d.flash);
      g.strokeStyle = '#b5a9ff';
      g.beginPath();
      g.arc(d.x, d.y, R + 3 + (1 - d.flash) * 6, 0, Math.PI * 2);
      g.stroke();
      g.globalAlpha = 1;
    }
    if (d.slash > 0) {
      const k = 1 - d.slash / 0.22;
      g.lineWidth = 3;
      g.strokeStyle = '#ffffff';
      g.globalAlpha = 1 - k;
      g.beginPath();
      g.arc(d.x, d.y, R + 7, d.face - 0.9 + k * 1.8, d.face - 0.5 + k * 1.8);
      g.stroke();
      g.globalAlpha = 1;
    }
  }

  function ready0(im: CanvasImageSource): boolean {
    return typeof HTMLImageElement === 'undefined' || !(im instanceof HTMLImageElement) || (im.complete && im.naturalWidth > 0);
  }

  function drawEnemy(g: CanvasRenderingContext2D, e: Enemy) {
    const ang = Math.atan2(CY - e.y, CX - e.x);
    const big = e.kind === 'boss' ? 2 : 1;
    g.save();
    g.translate(Math.round(e.x + (e.hurt > 0 ? (Math.sin(e.t * 90) > 0 ? 1.5 : -1.5) : 0)), Math.round(e.y));
    if (e.state === 'dying') {
      g.globalAlpha = Math.max(0, e.st / 0.5);
      g.rotate((1 - e.st / 0.5) * 2);
    }
    shadow(g, 0, 0, 7 * big);
    g.scale(big, big);
    if (e.kind === 'bot') {
      g.rotate(Math.PI / 4);
      px(g, -5, -5, 10, 10, '#ff6b7a');
      px(g, -5, -5, 10, 2, '#ffa0aa');
      g.rotate(-Math.PI / 4);
      circle(g, 0, 0, 2.5, '#ffffff');
      circle(g, 0, 0, 1.2, '#101010');
      g.globalAlpha *= 0.5 + 0.5 * Math.sin(e.t * 50);
      px(g, -9, -1, 18, 1, '#e8eeeb');
      g.globalAlpha = e.state === 'dying' ? Math.max(0, e.st / 0.5) : 1;
    } else if (e.kind === 'scammer') {
      circle(g, 0, 0, 6, '#46506a');
      circle(g, 0, -1, 3.5, '#f2c9a0');
      px(g, -3, -5, 6, 2, '#1c1c1c');
      px(g, -1, 2, 2, 3, '#e0344b');
      const bob = Math.sin(e.t * 4) * 1;
      px(g, -12, -17 + bob, 24, 9, '#fff6c8');
      px(g, -12, -17 + bob, 24, 1, '#c0394b');
      g.fillStyle = '#c0394b';
      g.font = `700 7px ${UI_FONT}`;
      g.textAlign = 'center';
      g.fillText('FREE $$$', 0, -10 + bob);
    } else {
      circle(g, 0, 0, 6.5, '#2b2146');
      circle(g, 0, -0.5, 4.5, '#0c0816');
      circle(g, Math.cos(ang) * 2 - 1.3, Math.sin(ang) * 2 - 0.5, 0.9, '#ff4d5e');
      circle(g, Math.cos(ang) * 2 + 1.3, Math.sin(ang) * 2 - 0.5, 0.9, '#ff4d5e');
      if (e.kind === 'boss') {
        g.lineWidth = 1.5;
        g.strokeStyle = '#ffd36b';
        g.beginPath();
        g.arc(0, 0, 7.5, Math.PI * 1.1, Math.PI * 1.9);
        g.stroke();
      }
      if (e.state !== 'pull') {
        g.save();
        g.rotate(ang + Math.PI / 2);
        px(g, 5, -5, 3, 10, '#c0394b');
        px(g, 5, -5, 3, 2, '#ffd36b');
        g.restore();
      }
    }
    g.restore();
    g.globalAlpha = 1;
    if (e.state === 'pull' && e.kind !== 'bot') {
      // the rug stretched toward the vault, tugged back and forth
      const len = Math.min(Math.hypot(CX - e.x, CY - e.y) - 12, e.kind === 'boss' ? 40 : 26);
      const tug = Math.sin(e.t * 14) * 1.5;
      for (let i = 0; i < len; i += 5) {
        g.fillStyle = (i / 5) % 2 === 0 ? '#c0394b' : '#ffd36b';
        g.fillRect(Math.round(e.x + Math.cos(ang) * (8 * big + i) + tug), Math.round(e.y + Math.sin(ang) * (8 * big + i)), 4, 3);
      }
    }
    if (e.state === 'dying') return;
    const w = e.kind === 'boss' ? 30 : 16;
    const top = e.y - (e.kind === 'boss' ? 20 : e.kind === 'scammer' ? 22 : 12);
    px(g, e.x - w / 2 - 1, top - 1, w + 2, 4, '#0c1315');
    px(g, e.x - w / 2, top, Math.round(w * Math.max(0, e.hp / e.max)), 2, e.kind === 'boss' ? '#ff6b7a' : '#ffb347');
    if (e.state === 'pull' && e.kind !== 'bot') {
      const total = e.kind === 'boss' ? 3.6 : 1.9;
      px(g, e.x - 9, top - 5, 18, 3, '#0c1315');
      px(g, e.x - 8, top - 4, Math.round(16 * (1 - Math.max(0, e.st) / total)), 1, '#ff4d5e');
    }
  }

  function bubble(g: CanvasRenderingContext2D, x: number, y: number, text: string) {
    g.font = `600 10px ${UI_FONT}`;
    g.textAlign = 'left';
    const w = Math.ceil(g.measureText(text).width) + 10;
    const bx = Math.max(3, Math.min(FW - w - 3, Math.round(x - w / 2)));
    const by = Math.max(3, Math.round(y - 14));
    g.fillStyle = '#fff6c8';
    g.fillRect(bx, by, w, 14);
    g.fillRect(Math.round(x) - 2, by + 14, 4, 3);
    g.fillStyle = '#16122b';
    g.fillText(text, bx + 5, by + 10.5);
  }

  function draw(g: CanvasRenderingContext2D) {
    g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    g.save();
    g.imageSmoothingEnabled = false;
    if (shake > 0.3) g.translate(Math.round(rr(-shake, shake) * 0.5), Math.round(rr(-shake, shake) * 0.5));
    drawGround(g);
    drawVault(g);
    for (const r of rings) {
      g.globalAlpha = Math.max(0, 1 - r.r / r.max);
      g.lineWidth = 4;
      g.strokeStyle = '#b5a9ff';
      g.beginPath();
      g.arc(CX, CY, r.r, 0, Math.PI * 2);
      g.stroke();
      g.globalAlpha = 1;
    }
    for (const e of [...enemies].sort((a, b) => a.y - b.y)) drawEnemy(g, e);
    for (const s of shots) {
      px(g, s.x - 7, s.y - 4, 14, 8, s.back ? '#8bd0ff' : '#fff6c8');
      px(g, s.x - 7, s.y - 4, 14, 2, s.back ? '#3a7fb8' : '#c0394b');
      g.fillStyle = s.back ? '#16365a' : '#c0394b';
      g.font = `700 6px ${UI_FONT}`;
      g.textAlign = 'center';
      g.fillText('LINK', s.x, s.y + 3);
    }
    for (const d of [...defs].sort((a, b) => a.y - b.y)) drawDef(g, d);
    for (const p of parts) {
      g.globalAlpha = Math.max(0, Math.min(1, p.life / p.max));
      g.fillStyle = p.color;
      if (p.coin) {
        circle(g, p.x, p.y, p.size, p.color);
      } else {
        g.fillRect(Math.round(p.x), Math.round(p.y), Math.ceil(p.size), Math.ceil(p.size));
      }
    }
    g.globalAlpha = 1;
    g.font = `700 11px ${UI_FONT}`;
    g.textAlign = 'center';
    g.lineJoin = 'round';
    g.lineWidth = 3;
    g.strokeStyle = '#000000';
    for (const f of floats) {
      g.globalAlpha = Math.min(1, f.life * 2);
      g.strokeText(f.text, f.x, f.y);
      g.fillStyle = f.color;
      g.fillText(f.text, f.x, f.y);
    }
    g.globalAlpha = 1;
    let shown = 0;
    for (const e of enemies) {
      if (shown >= 2) break;
      if (e.sayT > 0 && e.say && inView(e)) {
        bubble(g, e.x, e.y - (e.kind === 'boss' ? 26 : e.kind === 'scammer' ? 26 : 16), e.say);
        shown++;
      }
    }
    g.restore();
  }


  return {
    update,
    draw,
    setDefenders,
    stats(): FieldStats {
      const top = [...defs]
        .filter((d) => d.kills > 0)
        .sort((a, b) => b.kills - a.kills)
        .slice(0, 5)
        .map((d) => ({ mint: d.mint, name: d.name, symbol: d.symbol, kills: d.kills }));
      return { wave: Math.max(1, wave.n), rugs, scams, vault: Math.max(0, Math.round(vault)), meter: Math.round(meter), defenders: defs.length, banner: banner.t > 0 ? { text: banner.text, color: banner.color } : null, top };
    },
    /** Which coin's logo is under this point (in 480x272 canvas units), if any. */
    hitTest(x: number, y: number): string | null {
      let best: Def | null = null;
      let bd = R + 4;
      for (const d of defs) {
        const dist = Math.hypot(d.x - x, d.y - y);
        if (dist <= bd) {
          bd = dist;
          best = d;
        }
      }
      return best ? best.mint : null;
    },
    positions() {
      return defs.map((d) => ({ mint: d.mint, name: d.name, symbol: d.symbol, x: d.x, y: d.y }));
    },
    /** Test hook: every enemy currently alive, as plain data. */
    debugEnemies() {
      return enemies.map((e) => ({ id: e.id, kind: e.kind, x: e.x, y: e.y, state: e.state, claims: e.claims }));
    },
  };
}

export type Field = ReturnType<typeof createField>;
