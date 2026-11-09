// Orbit Pad launch pads: a cartoon space scene for the Explore page. Three pads each hold a rocket with a coin's logo on its side.
// Every few seconds one counts down, lights up and blasts off, and a fresh rocket for the next coin rolls onto its pad.
// The logos are the newest launches, using their real images. Everything else is made up.
// Pure canvas code with no React, so it can be tested on its own (scripts/factory-test.mjs). It is a show only.

export const FW = 480;
export const FH = 150;
export const SCALE = 4; // drawn at 4x so edges stay sharp when the canvas is stretched to the page width

const INK = '#14110f';
const GOLD = '#ffd426';
const PINK = '#ff3d9a';
const LIME = '#b6f23a';
const SKY = '#3cc8ff';
const STAR = '#f4f0ff';
const UI_FONT = "'Rubik', system-ui, sans-serif";

const GROUND = 134; // top of the dark floor strip
const PAD_TOP = GROUND - 8; // top of each launch platform; rockets stand here
const PADS = [92, 240, 388]; // pad centres
const COIN_COLORS = ['#f08a24', '#7bd13a', '#f06aa8', '#2fd3b8', '#8a6cff', '#3aa8f0'];
const BURN = 1.1; // seconds of engine fire before liftoff

export type FactoryCoin = { mint: string; name: string; symbol: string; image?: CanvasImageSource | null };
export type FactoryStats = { onBelt: number; made: number };

type Rocket = {
  coin: FactoryCoin | null;
  seed: number;
  state: 'arrive' | 'wait' | 'burn' | 'rise';
  t: number; // seconds in this state
  waitFor: number;
  lift: number; // how far above the pad, in px (0 = standing on it)
  vy: number;
};
type Slot = { rocket: Rocket | null; respawn: number };
type Puff = { x: number; y: number; r: number; age: number; life: number; vx: number };
type Spark = { x: number; y: number; vx: number; vy: number; age: number; life: number; color: string };

export type Factory = {
  update(dt: number): void;
  draw(g: CanvasRenderingContext2D): void;
  setCoins(list: FactoryCoin[]): void;
  stats(): FactoryStats;
};

const easeOutBack = (t: number) => {
  const c = 1.9;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function createFactory(opts: { rand?: () => number } = {}): Factory {
  const rand = opts.rand ?? Math.random;
  let t = 0;
  let made = 0; // launches so far
  let nextCoin = 0;
  let coins: FactoryCoin[] = [];
  const slots: Slot[] = PADS.map(() => ({ rocket: null, respawn: 0 }));
  const puffs: Puff[] = [];
  const sparks: Spark[] = [];

  function newRocket(initialWait?: number): Rocket {
    let coin: FactoryCoin | null = null;
    if (coins.length > 0) {
      coin = coins[nextCoin % coins.length];
      nextCoin++;
    }
    return { coin, seed: Math.floor(rand() * 1000), state: 'arrive', t: 0, waitFor: initialWait ?? 2.4 + rand() * 1.4, lift: 0, vy: 0 };
  }
  // Stagger the pads so a launch happens every second or two, not all at once.
  slots.forEach((s, i) => (s.rocket = newRocket(1.2 + i * 1.5)));
  slots.forEach((s) => s.rocket && (s.rocket.state = 'wait'));

  function smoke(x: number, n: number) {
    for (let i = 0; i < n; i++) {
      puffs.push({ x: x + (rand() - 0.5) * 10, y: GROUND - 3, r: 3 + rand() * 3, age: 0, life: 1.1 + rand() * 0.9, vx: (rand() - 0.5) * 34 });
    }
  }

  function update(dt: number) {
    t += dt;
    slots.forEach((slot, i) => {
      const px = PADS[i];
      const r = slot.rocket;
      if (!r) {
        slot.respawn -= dt;
        if (slot.respawn <= 0) slot.rocket = newRocket();
        return;
      }
      r.t += dt;
      if (r.state === 'arrive') {
        if (r.t >= 0.5) {
          r.state = 'wait';
          r.t = 0;
        }
      } else if (r.state === 'wait') {
        if (r.t >= r.waitFor) {
          r.state = 'burn';
          r.t = 0;
        }
      } else if (r.state === 'burn') {
        if (rand() < dt * 30) smoke(px, 1);
        if (r.t >= BURN) {
          r.state = 'rise';
          r.t = 0;
          r.vy = 8;
          smoke(px, 8);
        }
      } else {
        r.vy += 150 * dt;
        r.lift += r.vy * dt;
        if (rand() < dt * 18 && r.lift < 40) smoke(px, 1);
        if (rand() < dt * 40) {
          sparks.push({ x: px + (rand() - 0.5) * 4, y: PAD_TOP - r.lift + 2, vx: (rand() - 0.5) * 24, vy: 20 + rand() * 30, age: 0, life: 0.35 + rand() * 0.25, color: rand() < 0.5 ? GOLD : PINK });
        }
        if (r.lift > PAD_TOP + 70) {
          slot.rocket = null;
          slot.respawn = 0.5 + rand() * 0.9;
          made++;
        }
      }
    });
    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i];
      p.age += dt;
      p.x += p.vx * dt;
      p.vx *= 1 - dt * 1.2;
      p.y -= 5 * dt;
      p.r += 5 * dt;
      if (p.age > p.life) puffs.splice(i, 1);
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.age += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.age > s.life) sparks.splice(i, 1);
    }
  }

  /* ----------------------------- drawing ----------------------------- */

  function rrect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function box(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string, lw = 1.4) {
    rrect(g, x, y, w, h, r);
    g.fillStyle = fill;
    g.fill();
    g.lineWidth = lw;
    g.strokeStyle = INK;
    g.stroke();
  }
  function circle(g: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, lw = 1.2) {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fillStyle = fill;
    g.fill();
    if (lw > 0) {
      g.lineWidth = lw;
      g.strokeStyle = INK;
      g.stroke();
    }
  }
  function tri(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, fill: string, lw = 1.2) {
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.lineTo(x3, y3);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    g.lineWidth = lw;
    g.strokeStyle = INK;
    g.stroke();
  }
  // A four-point star, centred on (x, y) with outer radius r.
  function star(g: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 ? r * 0.38 : r;
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fillStyle = fill;
    g.fill();
  }

  // One rocket, standing with its base centred on (x, y). The coin's logo is on its side.
  function drawRocket(g: CanvasRenderingContext2D, x: number, y: number, r: Rocket, scale: number) {
    // look the coin up again by mint, so a logo that finishes loading shows up on rockets already on their pads
    const c = r.coin ? coins.find((k) => k.mint === r.coin!.mint) ?? r.coin : null;
    g.save();
    g.translate(x, y);
    g.scale(scale, scale);
    // engine fire
    if (r.state === 'burn' || r.state === 'rise') {
      const grow = r.state === 'burn' ? 0.2 + (r.t / BURN) * 0.5 : 1;
      const flick = 1 + Math.sin(t * 50 + r.seed) * 0.18;
      const len = (r.state === 'burn' ? 12 : 26) * grow * flick;
      tri(g, -4.5, 0, 4.5, 0, 0, len, GOLD, 1);
      tri(g, -2.6, 0, 2.6, 0, 0, len * 0.6, PINK, 0);
    }
    // fins
    tri(g, -7, -16, -14.5, 2, -7, -3, PINK, 1.3);
    tri(g, 7, -16, 14.5, 2, 7, -3, PINK, 1.3);
    // body
    g.beginPath();
    g.moveTo(-8, 0);
    g.lineTo(-8, -24);
    g.quadraticCurveTo(-8, -38, 0, -47);
    g.quadraticCurveTo(8, -38, 8, -24);
    g.lineTo(8, 0);
    g.closePath();
    g.fillStyle = STAR;
    g.fill();
    g.lineWidth = 1.4;
    g.strokeStyle = INK;
    g.stroke();
    // nose stripe and nozzle
    g.fillStyle = PINK;
    g.fillRect(-7.3, -29, 14.6, 4);
    g.fillStyle = INK;
    g.fillRect(-7.3, -29.3, 14.6, 0.7);
    g.fillRect(-7.3, -25.3, 14.6, 0.7);
    box(g, -4.5, -0.5, 9, 3, 0.8, '#3a3550', 1);
    // the coin's logo, in a gold porthole ring
    const cy = -12;
    circle(g, 0, cy, 7.4, GOLD, 1.2);
    if (c && c.image) {
      g.save();
      g.beginPath();
      g.arc(0, cy, 5.8, 0, Math.PI * 2);
      g.clip();
      try {
        g.drawImage(c.image, -5.8, cy - 5.8, 11.6, 11.6);
      } catch {
        circle(g, 0, cy, 5.8, COIN_COLORS[hash(c.mint) % COIN_COLORS.length], 0);
      }
      g.restore();
    } else {
      circle(g, 0, cy, 5.8, c ? COIN_COLORS[hash(c.mint) % COIN_COLORS.length] : COIN_COLORS[r.seed % COIN_COLORS.length], 0);
      g.fillStyle = '#fff';
      g.font = `700 7px ${UI_FONT}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(c ? (c.symbol[0] ?? '?').toUpperCase() : '$', 0, cy + 0.5);
    }
    g.lineWidth = 0.8;
    g.strokeStyle = 'rgba(20,17,15,0.5)';
    g.beginPath();
    g.arc(0, cy, 5.8, 0, Math.PI * 2);
    g.stroke();
    g.restore();
    // ticker label above the nose, riding along with the rocket
    if (c && c.symbol) {
      const label = `$${c.symbol.toUpperCase().slice(0, 10)}`;
      g.save();
      g.font = `700 ${Math.round(6.5 * scale)}px ${UI_FONT}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const w = g.measureText(label).width + 5;
      const h = 8 * scale;
      const ly = y - 47 * scale - h / 2 - 3;
      g.fillStyle = '#fff';
      g.strokeStyle = INK;
      g.lineWidth = 1;
      g.fillRect(x - w / 2, ly - h / 2, w, h);
      g.strokeRect(x - w / 2, ly - h / 2, w, h);
      g.fillStyle = INK;
      g.fillText(label, x, ly + 0.5);
      g.restore();
    }
  }

  function draw(g: CanvasRenderingContext2D) {
    g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    g.save();
    g.beginPath();
    g.rect(0, 0, FW, FH);
    g.clip();

    // night sky: stars, a ringed planet and a moon
    g.fillStyle = '#0b0a1f';
    g.fillRect(0, 0, FW, FH);
    for (let i = 0; i < 52; i++) {
      const sx = (i * 97) % FW;
      const sy = (i * 53 + (i % 3) * 11) % 110;
      const tw = 0.5 + 0.5 * Math.sin(t * 1.5 + i * 1.7);
      g.fillStyle = `rgba(244,240,255,${(0.35 + tw * 0.6).toFixed(2)})`;
      g.fillRect(sx, sy, i % 5 === 0 ? 1.6 : 1, i % 5 === 0 ? 1.6 : 1);
    }
    circle(g, 436, 36, 18, SKY, 1.4);
    g.beginPath();
    g.ellipse(436, 40, 32, 7, -0.28, 0, Math.PI * 2);
    g.lineWidth = 3;
    g.strokeStyle = GOLD;
    g.stroke();
    circle(g, 40, 28, 8, STAR, 1.1);
    circle(g, 37.5, 26, 1.6, '#cfc9f5', 0);
    circle(g, 43, 31, 1.1, '#cfc9f5', 0);
    star(g, 168, 40, 3, GOLD);
    star(g, 318, 22, 2.6, LIME);

    // distant skyline of the base
    g.fillStyle = '#17143a';
    for (let x = 0; x < FW; x += 34) g.fillRect(x, GROUND - 10 - ((x * 7) % 14), 22, 24);

    // launch pads: a platform, a tower with a beacon, and an arm that holds the rocket until it burns
    slots.forEach((slot, i) => {
      const px = PADS[i];
      const r = slot.rocket;
      const holding = r && (r.state === 'arrive' || r.state === 'wait');
      const near = r && r.state === 'wait' && r.waitFor - r.t < 1.2;
      box(g, px + 18, PAD_TOP - 52, 5, 52, 0.8, PINK, 1.2);
      g.strokeStyle = INK;
      g.lineWidth = 0.8;
      g.beginPath();
      for (let y = PAD_TOP - 50; y < PAD_TOP - 6; y += 11) {
        g.moveTo(px + 18, y);
        g.lineTo(px + 23, y + 11);
        g.moveTo(px + 23, y);
        g.lineTo(px + 18, y + 11);
      }
      g.stroke();
      circle(g, px + 20.5, PAD_TOP - 56, 3, near && Math.floor(t * 8) % 2 === 0 ? '#fff176' : holding ? LIME : '#7a1f4d', 1);
      if (holding) {
        box(g, px + 8, PAD_TOP - 30, 12, 3, 0.8, '#9aa1c7', 1);
      }
      box(g, px - 24, PAD_TOP, 48, 8, 2, GOLD, 1.4);
      g.fillStyle = INK;
      for (let k = -20; k < 22; k += 8) g.fillRect(px + k, PAD_TOP + 2, 4, 4);
    });

    // smoke behind the rockets
    for (const p of puffs) {
      const a = Math.max(0, 1 - p.age / p.life) * 0.8;
      g.fillStyle = `rgba(244,240,255,${a.toFixed(3)})`;
      g.beginPath();
      g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      g.fill();
    }

    // the rockets
    slots.forEach((slot, i) => {
      const r = slot.rocket;
      if (!r) return;
      let sc = 1.25;
      if (r.state === 'arrive') sc = 1.25 * Math.max(0.2, easeOutBack(Math.min(1, r.t / 0.5)));
      const shake = r.state === 'burn' ? Math.sin(t * 70 + i) * (0.3 + (r.t / BURN) * 0.7) : 0;
      const bob = r.state === 'wait' ? Math.sin(t * 2 + r.seed) * 0.3 : 0;
      drawRocket(g, PADS[i] + shake, PAD_TOP - r.lift + bob, r, sc);
    });

    for (const s of sparks) {
      g.globalAlpha = Math.max(0, 1 - s.age / s.life);
      g.fillStyle = s.color;
      g.fillRect(s.x - 1, s.y - 1, 2, 2);
    }
    g.globalAlpha = 1;

    // the floor, with a row of gold stars
    g.fillStyle = INK;
    g.fillRect(0, GROUND, FW, FH - GROUND);
    for (let x = 6, i = 0; x < FW + 10; x += 17, i++) star(g, x, GROUND + (i % 2 ? 8 : 13), 3, GOLD);
    g.fillStyle = '#2a2660';
    g.fillRect(0, GROUND, FW, 1.5);

    g.restore();
  }

  return {
    update,
    draw,
    setCoins(list) {
      coins = list.slice(0, 12);
      // rockets that were built before any coins were known pick one up now
      for (const sl of slots) {
        if (sl.rocket && !sl.rocket.coin && coins.length > 0) {
          sl.rocket.coin = coins[nextCoin % coins.length];
          nextCoin++;
        }
      }
    },
    stats: () => ({ onBelt: slots.filter((s) => s.rocket).length, made }),
  };
}
