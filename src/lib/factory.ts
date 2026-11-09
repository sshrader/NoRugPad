// Pawprint at work: a cartoon scene for the Explore page. A hopper drops fish and bones into a big pink animal-eared machine,
// which pumps coins and cartoon animals out onto a conveyor belt, where a paw stamp presses each one on the way past.
// The coins on the belt are the newest launches, using their real logos. Everything else is made up.
// Pure canvas code with no React, so it can be tested on its own (scripts/factory-test.mjs). It is a show only.

export const FW = 480;
export const FH = 150;
export const SCALE = 4; // drawn at 4x so edges stay sharp when the canvas is stretched to the page width

const INK = '#14110f';
const GOLD = '#ffd426';
const PINK = '#ff3d9a';
const LIME = '#b6f23a';
const SKY = '#3cc8ff';
const UI_FONT = "'Rubik', system-ui, sans-serif";

const GROUND = 132; // top of the dark floor strip
const BELT_X = 206; // where the belt starts, at the machine's mouth
const BELT_TOP = 113;
const ITEM_Y = BELT_TOP - 9; // item centres ride on the belt
const SPEED = 34; // belt speed in px per second
const STAMP_X = 330;
const MAX_ITEMS = 16;
const ANIMALS = 5; // cat, dog, bunny, bear, frog
const COIN_COLORS = ['#f08a24', '#7bd13a', '#f06aa8', '#2fd3b8', '#8a6cff', '#3aa8f0'];

export type FactoryCoin = { mint: string; name: string; symbol: string; image?: CanvasImageSource | null };
export type FactoryStats = { onBelt: number; made: number };

type Item = { kind: 'coin' | 'meme'; x: number; age: number; stamped: boolean; coin: FactoryCoin | null; variant: number; seed: number };
type Puff = { x: number; y: number; r: number; age: number; life: number; vx: number };
type Spark = { x: number; y: number; vx: number; vy: number; age: number; life: number; color: string };
type Bulb = { x: number; y: number; age: number; fish: boolean };

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

export function createFactory(opts: { rand?: () => number } = {}): Factory {
  const rand = opts.rand ?? Math.random;
  let t = 0;
  let spawnT = 0.4;
  let bulbT = 0.2;
  let puffT = 0;
  let made = 0;
  let nextCoin = 0;
  let lastKind: 'coin' | 'meme' = 'meme';
  let lamp = 0; // flashes when something is made
  let arm = 0; // 0 up .. 1 down
  let armDir = 0; // 1 pressing down, -1 coming back up, 0 idle
  let coins: FactoryCoin[] = [];
  const items: Item[] = [];
  const puffs: Puff[] = [];
  const sparks: Spark[] = [];
  const bulbs: Bulb[] = [];

  function spawn() {
    if (items.length >= MAX_ITEMS) return;
    // roughly every other item is a coin, so memes and coins alternate in a loose pattern
    const kind: 'coin' | 'meme' = lastKind === 'meme' ? (rand() < 0.75 ? 'coin' : 'meme') : rand() < 0.3 ? 'coin' : 'meme';
    lastKind = kind;
    let coin: FactoryCoin | null = null;
    if (kind === 'coin' && coins.length > 0) {
      coin = coins[nextCoin % coins.length];
      nextCoin++;
    }
    items.push({ kind, x: BELT_X - 4, age: 0, stamped: false, coin, variant: Math.floor(rand() * ANIMALS), seed: Math.floor(rand() * 1000) });
    made++;
    lamp = 1;
    for (let i = 0; i < 4; i++) {
      sparks.push({ x: BELT_X + 2, y: ITEM_Y - 2, vx: 20 + rand() * 30, vy: -20 - rand() * 25, age: 0, life: 0.4 + rand() * 0.2, color: i % 2 ? GOLD : PINK });
    }
  }

  function update(dt: number) {
    t += dt;
    spawnT -= dt;
    if (spawnT <= 0) {
      spawn();
      spawnT = 1.1 + rand() * 0.5;
    }
    bulbT -= dt;
    if (bulbT <= 0) {
      bulbs.push({ x: 56 + (rand() - 0.5) * 14, y: -6, age: 0, fish: rand() < 0.5 });
      bulbT = 0.8 + rand() * 0.5;
    }
    puffT -= dt;
    if (puffT <= 0) {
      for (const cx of [122, 146]) puffs.push({ x: cx, y: 14, r: 3 + rand() * 2, age: 0, life: 1.6 + rand() * 0.8, vx: 6 + rand() * 8 });
      puffT = 0.45;
    }
    lamp = Math.max(0, lamp - dt * 3);

    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.age += dt;
      it.x += SPEED * dt;
      // the stamp presses each item once as it passes underneath
      if (!it.stamped && it.x >= STAMP_X - 2 && armDir === 0) {
        it.stamped = true;
        armDir = 1;
        for (let k = 0; k < 5; k++) {
          sparks.push({ x: STAMP_X, y: ITEM_Y - 6, vx: (rand() - 0.5) * 60, vy: -15 - rand() * 30, age: 0, life: 0.35 + rand() * 0.2, color: k % 2 ? LIME : '#fff' });
        }
      } else if (!it.stamped && it.x >= STAMP_X + 6) {
        it.stamped = true; // the stamp was busy, so this one goes through unpressed
      }
      if (it.x > FW + 14) items.splice(i, 1);
    }

    if (armDir === 1) {
      arm += dt * 9;
      if (arm >= 1) {
        arm = 1;
        armDir = -1;
      }
    } else if (armDir === -1) {
      arm -= dt * 5;
      if (arm <= 0) {
        arm = 0;
        armDir = 0;
      }
    }

    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i];
      p.age += dt;
      p.x += p.vx * dt;
      p.y -= 9 * dt;
      p.r += 2.2 * dt;
      if (p.age > p.life) puffs.splice(i, 1);
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.age += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 90 * dt;
      if (s.age > s.life) sparks.splice(i, 1);
    }
    for (let i = bulbs.length - 1; i >= 0; i--) {
      const b = bulbs[i];
      b.age += dt;
      b.y += 34 * dt;
      if (b.y > 44) bulbs.splice(i, 1);
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

  function gear(g: CanvasRenderingContext2D, x: number, y: number, r: number, teeth: number, ang: number, fill: string) {
    g.beginPath();
    for (let i = 0; i < teeth * 2; i++) {
      const a = ang + (i / (teeth * 2)) * Math.PI * 2;
      const rr = i % 2 ? r * 0.78 : r;
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    g.lineWidth = 1;
    g.strokeStyle = INK;
    g.stroke();
    circle(g, x, y, r * 0.28, INK, 0);
  }

  function drawCoin(g: CanvasRenderingContext2D, x: number, y: number, c: FactoryCoin | null, seed: number, scale: number) {
    g.save();
    g.translate(x, y);
    g.scale(scale, scale);
    circle(g, 0, 0, 8, GOLD, 1.3);
    const color = COIN_COLORS[(c ? hash(c.mint) : seed) % COIN_COLORS.length];
    if (c && c.image) {
      g.save();
      g.beginPath();
      g.arc(0, 0, 6, 0, Math.PI * 2);
      g.clip();
      try {
        g.drawImage(c.image, -6, -6, 12, 12);
      } catch {
        circle(g, 0, 0, 6, color, 0);
      }
      g.restore();
    } else {
      circle(g, 0, 0, 6, color, 0);
      g.fillStyle = '#fff';
      g.font = `700 7px ${UI_FONT}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(c ? (c.symbol[0] ?? '?').toUpperCase() : '$', 0, 0.5);
    }
    g.lineWidth = 0.8;
    g.strokeStyle = 'rgba(20,17,15,0.45)';
    g.beginPath();
    g.arc(0, 0, 6, 0, Math.PI * 2);
    g.stroke();
    g.restore();
    // Ticker label above a real coin.
    if (c && c.symbol) {
      const label = `$${c.symbol.toUpperCase().slice(0, 10)}`;
      g.save();
      g.font = `700 ${Math.round(6.5 * scale)}px ${UI_FONT}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const w = g.measureText(label).width + 5;
      const h = 8 * scale;
      const ly = y - 8 * scale - h / 2 - 2;
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

  function ellipse(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot: number, fill: string, lw = 0) {
    g.beginPath();
    g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    g.fillStyle = fill;
    g.fill();
    if (lw > 0) {
      g.lineWidth = lw;
      g.strokeStyle = INK;
      g.stroke();
    }
  }
  function tri(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, fill: string, lw = 1) {
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
  // A paw print: one big pad and four toes. (x, y) is the centre of the pad.
  function pawPrint(g: CanvasRenderingContext2D, x: number, y: number, k: number, fill: string, lw = 0) {
    ellipse(g, x, y, 4 * k, 3.1 * k, 0, fill, lw);
    ellipse(g, x - 5 * k, y - 4.2 * k, 1.5 * k, 2 * k, -0.4, fill, lw);
    ellipse(g, x - 1.7 * k, y - 7 * k, 1.6 * k, 2.1 * k, -0.1, fill, lw);
    ellipse(g, x + 1.7 * k, y - 7 * k, 1.6 * k, 2.1 * k, 0.1, fill, lw);
    ellipse(g, x + 5 * k, y - 4.2 * k, 1.5 * k, 2 * k, 0.4, fill, lw);
  }

  // A cartoon animal head riding the belt: cat, dog, bunny, bear or frog.
  function drawAnimal(g: CanvasRenderingContext2D, x: number, y: number, variant: number, scale: number) {
    g.save();
    g.translate(x, y);
    g.scale(scale, scale);
    const fur = ['#f4a742', '#d8b48a', '#f2f2f7', '#9b6b4a', '#7bd13a'][variant];
    // ears go behind the head
    if (variant === 0) {
      tri(g, -8, -3, -3.5, -5.5, -7.5, -10.5, fur);
      tri(g, 8, -3, 3.5, -5.5, 7.5, -10.5, fur);
    } else if (variant === 1) {
      ellipse(g, -8, -1, 3, 5.2, 0.3, '#6b4a30', 1);
      ellipse(g, 8, -1, 3, 5.2, -0.3, '#6b4a30', 1);
    } else if (variant === 2) {
      ellipse(g, -4, -10, 2.4, 6, -0.1, fur, 1);
      ellipse(g, 4, -10, 2.4, 6, 0.1, fur, 1);
      ellipse(g, -4, -10, 1, 4, -0.1, '#ffb3d1', 0);
      ellipse(g, 4, -10, 1, 4, 0.1, '#ffb3d1', 0);
    } else if (variant === 3) {
      circle(g, -7, -6.5, 3, fur, 1);
      circle(g, 7, -6.5, 3, fur, 1);
    } else {
      circle(g, -5.5, -7, 3.2, fur, 1);
      circle(g, 5.5, -7, 3.2, fur, 1);
    }
    ellipse(g, 0, 0, 9.5, 8.5, 0, fur, 1.2);
    if (variant === 3 || variant === 1) ellipse(g, 0, 3.4, 4.6, 3.4, 0, '#f3dcc0', 0);
    // eyes
    if (variant === 4) {
      circle(g, -5.5, -7, 1.8, '#fff', 0.7);
      circle(g, 5.5, -7, 1.8, '#fff', 0.7);
      circle(g, -5.5, -6.8, 0.8, INK, 0);
      circle(g, 5.5, -6.8, 0.8, INK, 0);
    } else {
      circle(g, -3.4, -1.6, 1.7, '#fff', 0.7);
      circle(g, 3.4, -1.6, 1.7, '#fff', 0.7);
      circle(g, -3, -1.4, 0.8, INK, 0);
      circle(g, 3.8, -1.4, 0.8, INK, 0);
    }
    // nose and mouth
    if (variant === 4) {
      g.lineWidth = 0.9;
      g.strokeStyle = INK;
      g.beginPath();
      g.moveTo(-5, 3);
      g.quadraticCurveTo(0, 6.4, 5, 3);
      g.stroke();
    } else {
      ellipse(g, 0, 1.6, 1.5, 1.1, 0, variant === 2 ? '#ff8fb8' : INK, 0);
      g.lineWidth = 0.8;
      g.strokeStyle = INK;
      g.beginPath();
      g.moveTo(0, 2.6);
      g.quadraticCurveTo(-2, 5, -3.6, 3.6);
      g.moveTo(0, 2.6);
      g.quadraticCurveTo(2, 5, 3.6, 3.6);
      g.stroke();
    }
    if (variant === 0) {
      g.lineWidth = 0.6;
      g.beginPath();
      g.moveTo(-6, 1.6);
      g.lineTo(-10.5, 0.8);
      g.moveTo(-6, 3);
      g.lineTo(-10.5, 3.6);
      g.moveTo(6, 1.6);
      g.lineTo(10.5, 0.8);
      g.moveTo(6, 3);
      g.lineTo(10.5, 3.6);
      g.stroke();
    }
    g.restore();
  }

  function hash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }

  function draw(g: CanvasRenderingContext2D) {
    g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    g.save();
    g.beginPath();
    g.rect(0, 0, FW, FH);
    g.clip();

    // back wall with a few windows
    g.fillStyle = '#bfe9ff';
    g.fillRect(0, 0, FW, FH);
    for (let i = 0; i < 6; i++) {
      const wx = 232 + i * 42;
      box(g, wx, 14, 26, 22, 2, '#e9f8ff', 1.1);
      g.fillStyle = 'rgba(60,200,255,0.45)';
      g.fillRect(wx + 3, 17, 9, 16);
    }
    // chimneys and smoke
    box(g, 116, 16, 12, 22, 1.5, '#8a6cff');
    box(g, 140, 16, 12, 22, 1.5, '#8a6cff');
    for (const p of puffs) {
      const a = Math.max(0, 1 - p.age / p.life) * 0.85;
      g.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
      g.beginPath();
      g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      g.fill();
    }

    // idea hopper: a funnel fed by falling fish and bones
    for (const b of bulbs) {
      const a = Math.min(1, b.age * 3);
      g.globalAlpha = a;
      if (b.fish) {
        ellipse(g, b.x, b.y, 4, 2.4, 0, SKY, 0.9);
        tri(g, b.x + 3, b.y, b.x + 6.4, b.y - 2.4, b.x + 6.4, b.y + 2.4, SKY, 0.8);
        circle(g, b.x - 2, b.y - 0.5, 0.6, INK, 0);
      } else {
        g.lineWidth = 1;
        g.strokeStyle = INK;
        g.fillStyle = '#fff';
        g.fillRect(b.x - 3.4, b.y - 1, 6.8, 2);
        g.strokeRect(b.x - 3.4, b.y - 1, 6.8, 2);
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) circle(g, b.x + sx * 3.6, b.y + sy * 1.2, 1.3, '#fff', 0.8);
      }
      g.globalAlpha = 1;
    }
    g.beginPath();
    g.moveTo(26, 40);
    g.lineTo(86, 40);
    g.lineTo(64, 62);
    g.lineTo(48, 62);
    g.closePath();
    g.fillStyle = GOLD;
    g.fill();
    g.lineWidth = 1.4;
    g.strokeStyle = INK;
    g.stroke();
    box(g, 52, 62, 8, 16, 1, '#9aa1c7', 1.2);
    box(g, 52, 70, 48, 8, 1, '#9aa1c7', 1.2);

    // the machine, with big cat ears
    tri(g, 100, 40, 108, 14, 128, 36, PINK, 2);
    tri(g, 202, 40, 194, 14, 174, 36, PINK, 2);
    tri(g, 107, 36, 110, 22, 120, 34, '#ffb3d1', 0);
    tri(g, 195, 36, 192, 22, 182, 34, '#ffb3d1', 0);
    box(g, 96, 34, 110, 90, 8, PINK, 2);
    box(g, 106, 40, 90, 16, 3, GOLD, 1.4); // the sign plate: its words are HTML, laid over this
    circle(g, 150, 88, 22, '#fff', 1.6);
    g.save();
    g.beginPath();
    g.arc(150, 88, 20.4, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = '#d9f2ff';
    g.fillRect(128, 66, 44, 44);
    gear(g, 142, 90, 11, 8, t * 1.6, LIME);
    gear(g, 160, 82, 8, 6, -t * 2.3 + 0.3, SKY);
    g.restore();
    circle(g, 112, 108, 4.5, lamp > 0.05 ? '#fff176' : '#7a1f4d', 1.2);
    if (lamp > 0.05) {
      g.fillStyle = `rgba(255,241,118,${(lamp * 0.4).toFixed(3)})`;
      g.beginPath();
      g.arc(112, 108, 9, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 4; i++) box(g, 176, 98 + i * 5, 22, 2.6, 1, '#c21f73', 0.8);
    box(g, 198, 92, 12, 22, 2, INK, 1.2); // the mouth the belt starts from
    box(g, 102, 124, 12, 8, 1, INK, 1);
    box(g, 188, 124, 12, 8, 1, INK, 1);

    // belt: dark top with moving chevrons, rollers underneath
    box(g, BELT_X, BELT_TOP, FW - BELT_X + 4, 10, 4, '#3a3550', 1.4);
    g.save();
    g.beginPath();
    g.rect(BELT_X + 2, BELT_TOP + 1, FW - BELT_X, 8);
    g.clip();
    g.fillStyle = 'rgba(255,255,255,0.35)';
    const off = (t * SPEED) % 16;
    for (let x = BELT_X - 16 + off; x < FW; x += 16) {
      g.beginPath();
      g.moveTo(x, BELT_TOP + 2);
      g.lineTo(x + 3, BELT_TOP + 5);
      g.lineTo(x, BELT_TOP + 8);
      g.lineTo(x + 2, BELT_TOP + 8);
      g.lineTo(x + 5, BELT_TOP + 5);
      g.lineTo(x + 2, BELT_TOP + 2);
      g.closePath();
      g.fill();
    }
    g.restore();
    for (let x = BELT_X + 14; x < FW; x += 40) {
      circle(g, x, BELT_TOP + 15, 3.6, '#9aa1c7', 1);
      const a = t * 4 + x;
      g.strokeStyle = INK;
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(x + Math.cos(a) * 3, BELT_TOP + 15 + Math.sin(a) * 3);
      g.lineTo(x - Math.cos(a) * 3, BELT_TOP + 15 - Math.sin(a) * 3);
      g.stroke();
      box(g, x - 1.5, BELT_TOP + 18, 3, GROUND - BELT_TOP - 18, 0.5, '#6b6790', 0.9);
    }

    // items riding the belt
    for (const it of items) {
      const k = Math.min(1, it.age / 0.35);
      const s = k < 1 ? Math.max(0.2, easeOutBack(k)) : 1;
      const bob = Math.sin(t * 5 + it.seed) * 0.4;
      if (it.kind === 'coin') drawCoin(g, it.x, ITEM_Y + bob, it.coin, it.seed, s);
      else drawAnimal(g, it.x, ITEM_Y - 1 + bob, it.variant, s);
      if (it.stamped) {
        // a small lime paw where the stamp pressed
        pawPrint(g, it.x + 9, ITEM_Y - 6, 0.6, LIME, 0.7);
      }
    }

    // the stamp: a piston from the ceiling
    const headY = 54 + arm * 32;
    box(g, STAMP_X - 2.5, 0, 5, headY, 1, '#9aa1c7', 1.1);
    box(g, STAMP_X - 9, headY, 18, 8, 2, PINK, 1.4);
    pawPrint(g, STAMP_X, headY + 11.5, 0.9, INK);

    for (const s of sparks) {
      g.globalAlpha = Math.max(0, 1 - s.age / s.life);
      g.fillStyle = s.color;
      g.fillRect(s.x - 1, s.y - 1, 2, 2);
    }
    g.globalAlpha = 1;

    // the floor, with a trail of paw prints
    g.fillStyle = INK;
    g.fillRect(0, GROUND, FW, FH - GROUND);
    for (let x = 6, i = 0; x < FW + 10; x += 17, i++) pawPrint(g, x, GROUND + (i % 2 ? 11 : 15), 0.8, GOLD);
    g.fillStyle = INK;
    g.fillRect(0, GROUND + 3, FW, 1);

    g.restore();
  }

  return {
    update,
    draw,
    setCoins(list) {
      coins = list.slice(0, 12);
    },
    stats: () => ({ onBelt: items.length, made }),
  };
}
