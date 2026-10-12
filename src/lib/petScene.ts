// A tiny pixel-art world for the coin page: the pet wanders through a city, a meadow or a town.
// Pure canvas code with no React and no imports, so it is easy to test on its own.

export type PetLook = {
  species: 'cat' | 'dog';
  coat: string;
  coat2: string;
  ear: string;
  eye: string;
  kind: string; // cat: points|stripes|bib|patches|plain  dog: cheeks|mask|blaze|muzzle|plain
  earStyle?: 'point' | 'floppy' | 'fold' | 'tall';
  tongue?: boolean;
  short?: boolean; // short legs (corgi, dachshund)
};

export const W = 240;
export const H = 96;
const GROUND = 74; // where the pavement starts
const SCALE = 2; // pet sprite scale

export type SceneKind = 'city' | 'meadow' | 'town';
export const SCENE_NAMES: Record<SceneKind, string> = { city: 'the city', meadow: 'the meadow', town: 'the old town' };

/* ------------------------------ small helpers ------------------------------ */

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a: string, b: string, t: number): string {
  const x = rgb(a);
  const y = rgb(b);
  const c = x.map((v, i) => Math.round(v + (y[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/* ------------------------------ sprites ------------------------------ */

type Pose = 'walk0' | 'walk1' | 'idle' | 'sit';
const OUT = '#14161a';

function paintSprite(look: PetLook, pose: Pose): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 12;
  const g = c.getContext('2d')!;
  const px = (x: number, y: number, col: string) => {
    g.fillStyle = col;
    g.fillRect(x, y, 1, 1);
  };
  const rect = (x: number, y: number, w: number, h: number, col: string) => {
    g.fillStyle = col;
    g.fillRect(x, y, w, h);
  };
  const dog = look.species === 'dog';
  const legLen = look.short ? 1 : 3;
  const legCol = look.kind === 'points' && !dog ? look.coat2 : look.coat;
  const snout = look.kind === 'plain' && dog ? mix(look.coat, '#ffffff', 0.35) : look.coat2;

  if (pose === 'sit') {
    // tail on the ground
    rect(0, 9, 4, 2, legCol);
    // haunch, chest, head
    rect(3, 6, 7, 5, look.coat);
    rect(9, 5, 3, 6, look.coat);
    rect(9, 1, 5, 4, look.coat);
    if (look.kind === 'bib' || look.kind === 'cheeks' || look.kind === 'mask' || look.kind === 'blaze') rect(10, 6, 2, 4, look.coat2);
    if (look.kind === 'stripes') for (const x of [4, 6, 8]) rect(x, 6, 1, 2, look.coat2);
    if (look.kind === 'patches') rect(4, 6, 3, 2, look.coat2);
    if (look.kind === 'points') rect(10, 2, 3, 2, look.coat2);
    rect(10, 9, 2, 3, legCol);
    rect(3, 10, 4, 2, legCol);
    // ears
    if (!dog || look.earStyle === 'point') {
      px(9, 0, look.ear);
      px(13, 0, look.ear);
    } else if (look.earStyle === 'tall') {
      rect(9, -1, 1, 2, look.ear);
      rect(13, -1, 1, 2, look.ear);
    } else rect(8, 1, 2, 3, look.ear);
    px(12, 2, look.eye);
    if (dog) {
      rect(13, 3, 2, 2, snout);
      px(14, 3, '#16181A');
      if (look.tongue) px(13, 5, '#E86F7C');
    } else px(13, 3, '#E58F9A');
  } else {
    const bodyTop = 12 - legLen - 4;
    const headTop = bodyTop - 3;
    const lift = pose === 'walk0' ? 1 : 0;
    // tail
    const sway = pose === 'walk1' ? 1 : 0;
    if (dog) {
      px(1, bodyTop + 1, look.coat);
      px(0 + sway, bodyTop, look.coat);
      px(0 + sway, bodyTop - 1, look.coat);
    } else {
      px(1, bodyTop + 2, look.coat);
      px(0, bodyTop + 1, look.coat);
      px(0, bodyTop, look.coat);
      px(sway, bodyTop - 1, look.kind === 'points' ? look.coat2 : look.coat);
    }
    // legs: diagonal pairs lift, so it looks like walking
    const xs = [2, 5, 8, 11];
    xs.forEach((x, i) => {
      const up = pose !== 'idle' && (i + lift) % 2 === 1;
      const col = look.kind === 'bib' && !dog && i >= 2 ? look.coat2 : legCol;
      rect(x, 12 - legLen, 2, up ? Math.max(0, legLen - 1) : legLen, col);
    });
    // body and head
    rect(2, bodyTop, 10, 4, look.coat);
    rect(10, headTop, 5, 4, look.coat);
    if (look.kind === 'stripes') for (const x of [4, 6, 8, 10]) rect(x, bodyTop, 1, 2, look.coat2);
    if (look.kind === 'patches') {
      rect(3, bodyTop, 3, 2, look.coat2);
      rect(8, bodyTop + 1, 2, 2, '#2B2A33');
    }
    if (look.kind === 'bib' || look.kind === 'cheeks' || look.kind === 'mask' || look.kind === 'blaze') rect(10, bodyTop + 1, 2, 3, look.coat2);
    if (look.kind === 'plain' && dog) rect(3, bodyTop + 3, 8, 1, snout);
    if (look.kind === 'points' && !dog) rect(11, headTop + 1, 3, 2, look.coat2);
    // ears
    if (!dog || look.earStyle === 'point') {
      px(10, headTop - 1, look.ear);
      px(14, headTop - 1, look.ear);
      px(10, headTop, look.ear);
      px(14, headTop, look.ear);
    } else if (look.earStyle === 'tall') {
      rect(10, headTop - 2, 1, 3, look.ear);
      rect(13, headTop - 2, 1, 3, look.ear);
    } else rect(10, headTop, 2, 3, look.ear);
    px(13, headTop + 1, look.eye);
    if (dog) {
      rect(14, headTop + 2, 2, 2, snout);
      px(15, headTop + 2, '#16181A');
      if (look.tongue && pose !== 'idle') px(14, headTop + 4, '#E86F7C');
    } else px(14, headTop + 2, '#E58F9A');
  }

  // add a dark outline so the little pet stands out from any background
  const out = document.createElement('canvas');
  out.width = 18;
  out.height = 14;
  const og = out.getContext('2d')!;
  const src = g.getImageData(0, 0, 16, 12).data;
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < 16 && y < 12 && src[(y * 16 + x) * 4 + 3] > 0;
  og.fillStyle = OUT;
  for (let y = -1; y <= 12; y++) {
    for (let x = -1; x <= 16; x++) {
      if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) og.fillRect(x + 1, y + 1, 1, 1);
    }
  }
  og.drawImage(c, 1, 1);
  return out;
}

/* ------------------------------ colours by time of day ------------------------------ */

type Pal = {
  top: string; bot: string; far: string; mid: string; grass: string; road: string; line: string;
  night: boolean; dusk: boolean; win: string; tree: string; trunk: string; hill: string; hill2: string;
};

function palette(hour: number): Pal {
  const night = hour >= 20 || hour < 5;
  const dusk = (hour >= 17 && hour < 20) || (hour >= 5 && hour < 7);
  if (night) return { top: '#0B1230', bot: '#27386B', far: '#1B2748', mid: '#232F57', grass: '#24472F', road: '#262A33', line: '#4A5266', night, dusk, win: '#FFD66B', tree: '#1F4A33', trunk: '#3A2A22', hill: '#1D3B3A', hill2: '#173030' };
  if (dusk) return { top: '#3B3F8C', bot: '#F2A07A', far: '#7C6A9E', mid: '#6A5A8A', grass: '#4B8450', road: '#46464F', line: '#A8A0B0', night, dusk, win: '#FFD66B', tree: '#3E7C4A', trunk: '#5A3E2E', hill: '#5B8F6A', hill2: '#4C7E5E' };
  return { top: '#68BDF2', bot: '#D3EEFB', far: '#9DB7CC', mid: '#86A3BC', grass: '#63B35D', road: '#575C66', line: '#D8D8D0', night, dusk, win: '#BFE0F5', tree: '#3F9A4E', trunk: '#7A5638', hill: '#8FCB8C', hill2: '#79BC7A' };
}

/* ------------------------------ the scene ------------------------------ */

type Bld = { x: number; w: number; h: number; v: number; wins: boolean[] };
type Thing = { x: number; v: number };

export type Scene = {
  kind: SceneKind;
  update(dt: number): void;
  draw(g: CanvasRenderingContext2D): void;
  hop(): void;
};

export function createScene(opts: { mint: string; look: PetLook; hour?: number }): Scene {
  const seed = hash(opts.mint);
  const kind: SceneKind = (['city', 'meadow', 'town'] as const)[seed % 3];
  const rand = rng(seed ^ 0x9e3779b9);
  const pal = palette(opts.hour ?? new Date().getHours());

  const FAR_P = 480;
  const MID_P = 320;
  const far: Bld[] = [];
  for (let x = 0; x < FAR_P; ) {
    const w = kind === 'city' ? 16 + Math.floor(rand() * 16) : kind === 'town' ? 24 + Math.floor(rand() * 10) : 40 + Math.floor(rand() * 40);
    const h = kind === 'city' ? 22 + Math.floor(rand() * 34) : kind === 'town' ? 16 + Math.floor(rand() * 10) : 8 + Math.floor(rand() * 14);
    far.push({ x, w, h, v: rand(), wins: Array.from({ length: 40 }, () => rand() > 0.45) });
    x += w + (kind === 'city' ? 2 + Math.floor(rand() * 4) : kind === 'town' ? 6 + Math.floor(rand() * 8) : 0);
  }
  const mid: Thing[] = [];
  for (let x = 10; x < MID_P; x += 40 + Math.floor(rand() * 40)) mid.push({ x, v: rand() });
  const clouds: Thing[] = Array.from({ length: 4 }, (_, i) => ({ x: i * 110 + rand() * 40, v: rand() }));
  const stars = Array.from({ length: 28 }, () => ({ x: Math.floor(rand() * W), y: Math.floor(rand() * 40), t: rand() * 6 }));

  const sprites: Record<Pose, HTMLCanvasElement> = {
    walk0: paintSprite(opts.look, 'walk0'),
    walk1: paintSprite(opts.look, 'walk1'),
    idle: paintSprite(opts.look, 'idle'),
    sit: paintSprite(opts.look, 'sit'),
  };

  // what the pet is doing
  let mode: 'walk' | 'idle' | 'sit' = 'walk';
  let modeLeft = 4;
  let dir = 1;
  let scroll = 0; // how far the world has moved
  let clock = 0;
  let hopY = 0;
  let hopV = 0;
  let bird: { x: number; y: number } | null = null;
  let birdWait = 4 + rand() * 6;
  const SPEED = 20; // pixels per second

  function nextMode() {
    const r = rand();
    if (mode === 'walk') {
      mode = r < 0.55 ? 'idle' : 'sit';
      modeLeft = mode === 'sit' ? 2.5 + rand() * 3 : 1 + rand() * 2;
    } else {
      mode = 'walk';
      modeLeft = 4 + rand() * 6;
      if (rand() < 0.25) dir = -dir; // sometimes turns around
    }
  }

  function update(dt: number) {
    clock += dt;
    modeLeft -= dt;
    if (modeLeft <= 0) nextMode();
    if (mode === 'walk') scroll += dir * SPEED * dt;
    if (hopY > 0 || hopV !== 0) {
      hopV -= 220 * dt;
      hopY = Math.max(0, hopY + hopV * dt);
      if (hopY === 0) hopV = 0;
    }
    birdWait -= dt;
    if (birdWait <= 0 && !bird && !pal.night) {
      bird = { x: -8, y: 12 + rand() * 20 };
      birdWait = 8 + rand() * 10;
    }
    if (bird) {
      bird.x += 34 * dt;
      if (bird.x > W + 8) bird = null;
    }
  }

  function hop() {
    if (hopY === 0) hopV = 70;
  }

  const wrap = (v: number, p: number) => ((v % p) + p) % p;

  function drawBuilding(g: CanvasRenderingContext2D, b: Bld, x: number) {
    const base = GROUND;
    const top = base - b.h;
    const col = mix(pal.far, pal.bot, 0.15 + b.v * 0.25);
    g.fillStyle = col;
    if (kind === 'city') {
      g.fillRect(x, top, b.w, b.h);
      if (b.v > 0.6) g.fillRect(x + Math.floor(b.w / 2) - 1, top - 5, 2, 5); // antenna
      let i = 0;
      for (let wy = top + 4; wy < base - 4; wy += 6) {
        for (let wx = x + 3; wx < x + b.w - 3; wx += 5) {
          const on = b.wins[i++ % b.wins.length];
          g.fillStyle = pal.night ? (on ? pal.win : mix(col, '#000000', 0.25)) : on ? pal.win : mix(col, '#ffffff', 0.12);
          g.fillRect(wx, wy, 2, 3);
        }
      }
    } else if (kind === 'town') {
      g.fillRect(x, top + 6, b.w, b.h - 6);
      // roof
      g.fillStyle = mix('#a8574a', pal.bot, pal.night ? 0.6 : 0.15);
      for (let r = 0; r < 6; r++) g.fillRect(x - 2 + r, top + 6 - r, b.w + 4 - r * 2, 1);
      g.fillStyle = mix(col, '#000000', 0.25);
      g.fillRect(x + b.w - 7, top - 2, 3, 6); // chimney
      g.fillStyle = pal.night ? pal.win : mix(col, '#ffffff', 0.35);
      g.fillRect(x + 4, top + 9, 3, 4);
      g.fillRect(x + b.w - 9, top + 9, 3, 4);
    } else {
      // rolling hill
      g.fillStyle = b.v > 0.5 ? pal.hill : pal.hill2;
      for (let i = 0; i < b.w; i++) {
        const t = i / b.w;
        const hh = Math.round(Math.sin(t * Math.PI) * b.h);
        g.fillRect(x + i, base - hh, 1, hh);
      }
    }
  }

  function drawTree(g: CanvasRenderingContext2D, x: number, v: number) {
    const h = 14 + Math.floor(v * 8);
    g.fillStyle = pal.trunk;
    g.fillRect(x + 4, GROUND - 6, 3, 6);
    g.fillStyle = pal.tree;
    g.fillRect(x, GROUND - 6 - h + 6, 11, h - 2);
    g.fillRect(x + 2, GROUND - 6 - h + 3, 7, 4);
    g.fillStyle = mix(pal.tree, '#ffffff', 0.15);
    g.fillRect(x + 2, GROUND - 6 - h + 8, 3, 2);
  }

  function drawLamp(g: CanvasRenderingContext2D, x: number) {
    g.fillStyle = mix(pal.mid, '#000000', 0.35);
    g.fillRect(x, GROUND - 22, 2, 22);
    g.fillRect(x - 2, GROUND - 24, 6, 2);
    if (pal.night || pal.dusk) {
      g.fillStyle = 'rgba(255,214,107,0.18)';
      g.fillRect(x - 6, GROUND - 22, 14, 22);
      g.fillStyle = pal.win;
      g.fillRect(x - 1, GROUND - 22, 4, 2);
    } else {
      g.fillStyle = '#d8d8d0';
      g.fillRect(x - 1, GROUND - 22, 4, 2);
    }
  }

  function drawFence(g: CanvasRenderingContext2D, x: number) {
    g.fillStyle = mix(pal.trunk, pal.bot, 0.2);
    g.fillRect(x, GROUND - 9, 22, 1);
    g.fillRect(x, GROUND - 5, 22, 1);
    for (let i = 0; i < 22; i += 5) g.fillRect(x + i, GROUND - 11, 2, 11);
  }

  function draw(g: CanvasRenderingContext2D) {
    // sky
    const grad = g.createLinearGradient(0, 0, 0, GROUND);
    grad.addColorStop(0, pal.top);
    grad.addColorStop(1, pal.bot);
    g.fillStyle = grad;
    g.fillRect(0, 0, W, GROUND);

    if (pal.night) {
      for (const s of stars) {
        g.fillStyle = Math.sin(clock * 2 + s.t) > -0.3 ? '#ffffff' : '#7f8fb8';
        g.fillRect(s.x, s.y, 1, 1);
      }
      // a crescent moon
      g.fillStyle = '#F4F1D0';
      const moon = ['..XXXX..', '.XXX....', 'XXX.....', 'XXX.....', 'XXX.....', 'XXX.....', '.XXX....', '..XXXX..'];
      moon.forEach((row, ry) => {
        for (let rx = 0; rx < row.length; rx++) if (row[rx] === 'X') g.fillRect(200 + rx, 10 + ry, 1, 1);
      });
    } else {
      g.fillStyle = pal.dusk ? '#FFD6A0' : '#FFE27A';
      g.fillRect(190, pal.dusk ? 34 : 12, 12, 12);
    }

    // clouds
    if (!pal.night) {
      g.fillStyle = pal.dusk ? 'rgba(255,225,215,0.85)' : 'rgba(255,255,255,0.9)';
      for (const c of clouds) {
        const x = wrap(c.x - scroll * 0.08 - clock * 1.5, 440) - 40;
        const y = 8 + Math.floor(c.v * 24);
        g.fillRect(x + 4, y + 3, 24, 5);
        g.fillRect(x + 9, y, 12, 4);
      }
    }

    // far skyline
    const fo = scroll * 0.25;
    for (let rep = -1; rep <= 1; rep++) {
      for (const b of far) {
        const x = Math.round(b.x - wrap(fo, FAR_P) + rep * FAR_P);
        if (x > W || x + b.w + 4 < 0) continue;
        drawBuilding(g, b, x);
      }
    }

    // ground
    g.fillStyle = pal.grass;
    g.fillRect(0, GROUND, W, 4);
    g.fillStyle = pal.road;
    g.fillRect(0, GROUND + 4, W, H - GROUND - 4);
    g.fillStyle = mix(pal.road, '#ffffff', 0.08);
    g.fillRect(0, GROUND + 4, W, 1);
    // road dashes move with the world
    g.fillStyle = pal.line;
    const ro = wrap(scroll, 32);
    for (let x = -32; x < W + 32; x += 32) g.fillRect(Math.round(x - ro), GROUND + 15, 14, 2);

    // mid layer
    const mo = scroll * 0.6;
    for (let rep = -1; rep <= 1; rep++) {
      for (const t of mid) {
        const x = Math.round(t.x - wrap(mo, MID_P) + rep * MID_P);
        if (x > W || x < -30) continue;
        if (kind === 'city') drawLamp(g, x);
        else if (kind === 'meadow') drawTree(g, x, t.v);
        else if (t.v > 0.5) drawFence(g, x);
        else drawLamp(g, x);
      }
    }

    // fireflies at night
    if (pal.night) {
      for (let i = 0; i < 9; i++) {
        const fx = (i * 29 + Math.sin(clock * 0.7 + i) * 8 + 10) % W;
        const fy = 40 + ((i * 17) % 28) + Math.sin(clock * 1.1 + i * 2) * 4;
        if (Math.sin(clock * 3 + i) > 0) {
          g.fillStyle = '#E8FF8A';
          g.fillRect(Math.round(fx), Math.round(fy), 1, 1);
        }
      }
    }

    // a bird crossing the sky
    if (bird) {
      g.fillStyle = '#2d3340';
      const flap = Math.floor(clock * 6) % 2 === 0;
      g.fillRect(Math.round(bird.x), Math.round(bird.y) + (flap ? 0 : 1), 3, 1);
      g.fillRect(Math.round(bird.x) + 3, Math.round(bird.y) + (flap ? 1 : 0), 3, 1);
    }

    // the pet
    const pose: Pose = mode === 'sit' ? 'sit' : mode === 'idle' ? 'idle' : Math.floor(clock * 4.5) % 2 === 0 ? 'walk0' : 'walk1';
    const sp = sprites[pose];
    const sw = sp.width * SCALE;
    const sh = sp.height * SCALE;
    const px = Math.round(W / 2 - sw / 2);
    const bob = mode === 'walk' && Math.floor(clock * 4.5) % 2 === 0 ? 0 : 1;
    const py = Math.round(GROUND + 17 - sh + (mode === 'walk' ? 0 : 0) - hopY + bob * 0);
    // shadow
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(px + 4, GROUND + 17, sw - 8, 2);
    g.save();
    if (dir < 0) {
      g.translate(px + sw, py);
      g.scale(-1, 1);
      g.drawImage(sp, 0, 0, sw, sh);
    } else g.drawImage(sp, px, py, sw, sh);
    g.restore();

    // little heart while hopping
    if (hopY > 4) {
      g.fillStyle = '#FF6B8B';
      const hx = px + sw - 6;
      const hy = py - 10;
      g.fillRect(hx, hy, 2, 2);
      g.fillRect(hx + 3, hy, 2, 2);
      g.fillRect(hx, hy + 1, 5, 2);
      g.fillRect(hx + 1, hy + 3, 3, 1);
    }
  }

  return { kind, update, draw, hop };
}
