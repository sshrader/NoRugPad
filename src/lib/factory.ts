// Orbit Pad launch control: a cartoon space scene for the Explore page. A hopper drops sparks of ideas into a big pink console,
// which pumps coins and little space crew out onto a conveyor belt, where a star stamp presses each one on the way past.
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
const CREW = 5; // alien, robot, astronaut, cyclops, blob
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
    items.push({ kind, x: BELT_X - 4, age: 0, stamped: false, coin, variant: Math.floor(rand() * CREW), seed: Math.floor(rand() * 1000) });
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
  // A four-point star, centred on (x, y) with outer radius r.
  function star(g: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, lw = 0) {
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
    if (lw > 0) {
      g.lineWidth = lw;
      g.strokeStyle = INK;
      g.stroke();
    }
  }

  // A little space crew member riding the belt: alien, robot, astronaut, cyclops or blob.
  function drawCrew(g: CanvasRenderingContext2D, x: number, y: number, variant: number, scale: number) {
    g.save();
    g.translate(x, y);
    g.scale(scale, scale);
    g.lineCap = 'round';
    const eye = (ex: number, ey: number, r: number, px = 0) => {
      circle(g, ex, ey, r, '#fff', 0.7);
      circle(g, ex + px, ey + 0.3, r * 0.45, INK, 0);
    };
    if (variant === 0) {
      // green alien with two antennae
      g.lineWidth = 1;
      g.strokeStyle = INK;
      g.beginPath();
      g.moveTo(-4, -6);
      g.lineTo(-6, -11);
      g.moveTo(4, -6);
      g.lineTo(6, -11);
      g.stroke();
      circle(g, -6, -11.5, 1.8, GOLD, 0.9);
      circle(g, 6, -11.5, 1.8, GOLD, 0.9);
      ellipse(g, 0, 0, 9.5, 8.5, 0, '#7bd13a', 1.2);
      eye(-3.6, -1, 2.3, -0.4);
      eye(3.6, -1, 2.3, 0.4);
      g.beginPath();
      g.moveTo(-3.4, 4);
      g.quadraticCurveTo(0, 6.6, 3.4, 4);
      g.stroke();
    } else if (variant === 1) {
      // grey robot with a square head
      g.lineWidth = 1;
      g.strokeStyle = INK;
      g.beginPath();
      g.moveTo(0, -8);
      g.lineTo(0, -12);
      g.stroke();
      circle(g, 0, -12.5, 1.6, PINK, 0.9);
      box(g, -9, -8, 18, 16, 3, '#c9cde8', 1.2);
      box(g, -6.5, -4.5, 5, 4.5, 1, SKY, 0.8);
      box(g, 1.5, -4.5, 5, 4.5, 1, SKY, 0.8);
      g.fillStyle = INK;
      g.fillRect(-4, 3, 8, 3);
      g.fillStyle = '#c9cde8';
      g.fillRect(-2.2, 3, 0.8, 3);
      g.fillRect(0.4, 3, 0.8, 3);
    } else if (variant === 2) {
      // astronaut in a white helmet
      circle(g, 0, 0, 10, '#f4f0ff', 1.2);
      ellipse(g, 0, 0.5, 7, 5.8, 0, '#1b1442', 1);
      ellipse(g, -2.6, -1.6, 2, 1.1, -0.5, 'rgba(255,255,255,0.7)', 0);
      circle(g, 4.6, 7.4, 1.6, PINK, 0.7);
    } else if (variant === 3) {
      // purple cyclops with little horns
      tri(g, -7, -5, -3, -7, -6.5, -11.5, '#8a6cff', 1);
      tri(g, 7, -5, 3, -7, 6.5, -11.5, '#8a6cff', 1);
      ellipse(g, 0, 0, 9.5, 8.8, 0, '#8a6cff', 1.2);
      circle(g, 0, -1, 4.4, '#fff', 0.9);
      circle(g, Math.sin(t * 2.4) * 1.2, -0.8, 2, INK, 0);
      g.lineWidth = 1;
      g.strokeStyle = INK;
      g.beginPath();
      g.moveTo(-3.6, 5);
      g.quadraticCurveTo(0, 7.4, 3.6, 5);
      g.stroke();
    } else {
      // pink blob with stalk eyes and a tongue
      g.lineWidth = 1;
      g.strokeStyle = INK;
      g.beginPath();
      g.moveTo(-3.5, -5);
      g.lineTo(-4.5, -10);
      g.moveTo(3.5, -5);
      g.lineTo(4.5, -10);
      g.stroke();
      eye(-4.5, -10.5, 2.2, -0.3);
      eye(4.5, -10.5, 2.2, 0.3);
      ellipse(g, 0, 1, 10, 8, 0, '#ff8fb8', 1.2);
      g.beginPath();
      g.moveTo(-4.5, 3);
      g.quadraticCurveTo(0, 7, 4.5, 3);
      g.stroke();
      ellipse(g, 1.8, 6, 1.6, 2, 0, PINK, 0.8);
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

    // night sky: stars, a ringed planet and a moon
    g.fillStyle = '#0b0a1f';
    g.fillRect(0, 0, FW, FH);
    for (let i = 0; i < 46; i++) {
      const sx = (i * 97) % FW;
      const sy = (i * 53 + (i % 3) * 11) % 100;
      const tw = 0.5 + 0.5 * Math.sin(t * 1.5 + i * 1.7);
      g.fillStyle = `rgba(244,240,255,${(0.35 + tw * 0.6).toFixed(2)})`;
      g.fillRect(sx, sy, i % 5 === 0 ? 1.6 : 1, i % 5 === 0 ? 1.6 : 1);
    }
    circle(g, 404, 44, 22, SKY, 1.4);
    g.beginPath();
    g.ellipse(404, 48, 38, 8, -0.28, 0, Math.PI * 2);
    g.lineWidth = 3;
    g.strokeStyle = GOLD;
    g.stroke();
    circle(g, 300, 30, 9, '#f4f0ff', 1.1);
    circle(g, 297, 28, 1.8, '#cfc9f5', 0);
    circle(g, 303, 33, 1.2, '#cfc9f5', 0);
    star(g, 262, 60, 3.2, GOLD);
    star(g, 456, 96, 2.6, LIME);

    // idea hopper: a funnel fed by falling sparks
    for (const b of bulbs) {
      const a = Math.min(1, b.age * 3);
      g.globalAlpha = a;
      star(g, b.x, b.y, b.fish ? 4.4 : 3.4, b.fish ? GOLD : LIME, 0.9);
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

    // the console, with a little dish on top
    g.lineWidth = 2;
    g.strokeStyle = '#9aa1c7';
    g.beginPath();
    g.moveTo(150, 34);
    g.lineTo(150, 16);
    g.stroke();
    circle(g, 150, 14, 3.2, lamp > 0.05 ? '#fff176' : GOLD, 1.2);
    g.beginPath();
    g.arc(172, 30, 10, Math.PI, Math.PI * 1.9);
    g.lineWidth = 2;
    g.strokeStyle = '#9aa1c7';
    g.stroke();
    box(g, 96, 34, 110, 90, 8, PINK, 2);
    box(g, 106, 40, 90, 16, 3, GOLD, 1.4); // the sign plate: its words are HTML, laid over this
    circle(g, 150, 88, 22, '#fff', 1.6);
    g.save();
    g.beginPath();
    g.arc(150, 88, 20.4, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = '#0b0a1f';
    g.fillRect(128, 66, 44, 44);
    for (let i = 0; i < 7; i++) {
      const tw = 0.5 + 0.5 * Math.sin(t * 2 + i * 2.1);
      g.fillStyle = `rgba(244,240,255,${(0.4 + tw * 0.6).toFixed(2)})`;
      g.fillRect(132 + ((i * 13) % 36), 70 + ((i * 17) % 34), 1.2, 1.2);
    }
    circle(g, 150, 88, 10, SKY, 1);
    g.beginPath();
    g.ellipse(150, 90, 17, 4, -0.3, 0, Math.PI * 2);
    g.lineWidth = 1.6;
    g.strokeStyle = GOLD;
    g.stroke();
    circle(g, 150 + Math.cos(t * 1.4) * 16, 88 + Math.sin(t * 1.4) * 9, 2.6, LIME, 0.8);
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
      else drawCrew(g, it.x, ITEM_Y - 1 + bob, it.variant, s);
      if (it.stamped) {
        // a small lime star where the stamp pressed
        star(g, it.x + 9, ITEM_Y - 7, 3.6, LIME, 0.7);
      }
    }

    // the stamp: a piston from the ceiling
    const headY = 54 + arm * 32;
    box(g, STAMP_X - 2.5, 0, 5, headY, 1, '#9aa1c7', 1.1);
    box(g, STAMP_X - 9, headY, 18, 8, 2, PINK, 1.4);
    star(g, STAMP_X, headY + 13, 5, GOLD, 0.8);

    for (const s of sparks) {
      g.globalAlpha = Math.max(0, 1 - s.age / s.life);
      g.fillStyle = s.color;
      g.fillRect(s.x - 1, s.y - 1, 2, 2);
    }
    g.globalAlpha = 1;

    // the floor, with a row of gold stars
    g.fillStyle = INK;
    g.fillRect(0, GROUND, FW, FH - GROUND);
    for (let x = 6, i = 0; x < FW + 10; x += 17, i++) star(g, x, GROUND + (i % 2 ? 9 : 14), 3, GOLD);
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
