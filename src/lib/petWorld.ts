// A shared top-down pixel park. Every coin's pet lives here and wanders around on its own.
// Pure canvas code with no React and no imports, so it can be tested on its own.

export type PetLook = {
  species: 'cat' | 'dog';
  coat: string;
  coat2: string;
  ear: string;
  eye: string;
  kind: string; // cat: points|stripes|bib|patches|plain  dog: cheeks|mask|blaze|muzzle|plain
  earStyle?: 'point' | 'floppy' | 'fold' | 'tall';
  tongue?: boolean;
  short?: boolean;
};

export type WorldPet = { mint: string; petId: string; look: PetLook; name: string; symbol: string };

export const TILE = 16;
export const COLS = 30;
export const ROWS = 17;
export const W = COLS * TILE; // 480
export const H = ROWS * TILE; // 272

type Dir = 'up' | 'right' | 'down' | 'left';
const DIRS: Dir[] = ['up', 'right', 'down', 'left'];
const DV: Record<Dir, [number, number]> = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };

/* ------------------------------ helpers ------------------------------ */

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
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

const mk = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

/* ------------------------------ top-down sprites ------------------------------ */

const OUT = '#14161a';

// Draw the pet facing UP, seen from above. Other directions are this picture turned by 90 degrees.
function paintUp(look: PetLook, frame: 0 | 1 | 2): HTMLCanvasElement {
  const c = mk(16, 16);
  const g = c.getContext('2d')!;
  const px = (x: number, y: number, col: string) => {
    g.fillStyle = col;
    g.fillRect(x, y, 1, 1);
  };
  const rect = (x: number, y: number, w: number, h: number, col: string) => {
    g.fillStyle = col;
    g.fillRect(x, y, w, h);
  };
  const round = (x: number, y: number, w: number, h: number, col: string) => {
    g.fillStyle = col;
    for (let i = 0; i < h; i++) {
      const inset = i === 0 || i === h - 1 ? 1 : 0;
      g.fillRect(x + inset, y + i, w - inset * 2, 1);
    }
  };
  const dog = look.species === 'dog';
  const legCol = look.kind === 'points' && !dog ? look.coat2 : look.coat;
  const pawCol = look.kind === 'bib' && !dog ? look.coat2 : legCol;
  const snout = dog ? (look.kind === 'plain' ? mix(look.coat, '#ffffff', 0.35) : look.coat2) : '#E58F9A';
  const a = frame === 0 ? -1 : 0;
  const b = frame === 1 ? -1 : 0;
  const sway = frame === 1 ? 1 : 0;
  const tailCol = look.kind === 'points' && !dog ? look.coat2 : look.coat;

  // legs, tail
  rect(4, 7 + a, 2, 2, pawCol);
  rect(10, 7 + b, 2, 2, pawCol);
  rect(4, 11 + b, 2, 2, legCol);
  rect(10, 11 + a, 2, 2, legCol);
  if (dog) rect(7 + sway, 13, 2, 2, tailCol);
  else {
    px(8, 13, tailCol);
    px(8 + sway, 14, tailCol);
    px(9 + sway, 15, tailCol);
  }

  // body
  round(5, 6, 6, 7, look.coat);
  if (look.kind === 'stripes') for (const y of [7, 9, 11]) rect(5, y, 6, 1, look.coat2);
  if (look.kind === 'patches') {
    rect(5, 7, 3, 3, look.coat2);
    rect(8, 10, 3, 2, '#2B2A33');
  }
  if (look.kind === 'bib' || look.kind === 'cheeks' || look.kind === 'mask' || look.kind === 'blaze') rect(6, 6, 4, 2, look.coat2);
  if (look.kind === 'plain' && dog) rect(6, 11, 4, 1, snout);

  // head
  round(5, 2, 6, 5, look.coat);
  if (look.kind === 'points' && !dog) round(6, 3, 4, 3, look.coat2);
  if (dog && (look.kind === 'cheeks' || look.kind === 'mask')) round(5, 4, 6, 3, look.coat2);
  if (dog && look.kind === 'blaze') rect(7, 1, 2, 5, look.coat2);

  // ears
  if (!dog || look.earStyle === 'point') {
    rect(5, 1, 2, 2, look.ear);
    rect(9, 1, 2, 2, look.ear);
    if (!dog) {
      px(6, 2, '#E58F9A');
      px(9, 2, '#E58F9A');
    }
  } else if (look.earStyle === 'tall') {
    rect(4, 0, 2, 3, look.ear);
    rect(10, 0, 2, 3, look.ear);
  } else if (look.earStyle === 'floppy') {
    rect(3, 3, 2, 4, look.ear);
    rect(11, 3, 2, 4, look.ear);
  } else {
    rect(4, 2, 2, 3, look.ear);
    rect(10, 2, 2, 3, look.ear);
  }

  // face
  if (dog) {
    rect(6, 0, 4, 3, snout);
    rect(7, 0, 2, 1, '#16181A');
  } else rect(7, 3, 2, 1, '#E58F9A');
  px(6, 4, look.eye);
  px(9, 4, look.eye);

  // dark outline so the pet stands out on any ground
  const out = mk(18, 18);
  const og = out.getContext('2d')!;
  const src = g.getImageData(0, 0, 16, 16).data;
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < 16 && y < 16 && src[(y * 16 + x) * 4 + 3] > 0;
  og.fillStyle = OUT;
  for (let y = -1; y <= 16; y++) {
    for (let x = -1; x <= 16; x++) {
      if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) og.fillRect(x + 1, y + 1, 1, 1);
    }
  }
  og.drawImage(c, 1, 1);
  return out;
}

function turned(src: HTMLCanvasElement, dir: Dir): HTMLCanvasElement {
  if (dir === 'up') return src;
  const c = mk(18, 18);
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  g.translate(9, 9);
  g.rotate(dir === 'right' ? Math.PI / 2 : dir === 'down' ? Math.PI : -Math.PI / 2);
  g.drawImage(src, -9, -9);
  return c;
}

type SpriteSet = Record<Dir, [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement]>;
const spriteCache = new Map<string, SpriteSet>();
function spritesFor(petId: string, look: PetLook): SpriteSet {
  let s = spriteCache.get(petId);
  if (!s) {
    const base = [paintUp(look, 0), paintUp(look, 1), paintUp(look, 2)] as const;
    s = {} as SpriteSet;
    for (const d of DIRS) s[d] = [turned(base[0], d), turned(base[1], d), turned(base[2], d)];
    spriteCache.set(petId, s);
  }
  return s;
}

/* ------------------------------ the terrain ------------------------------ */

type Terrain = { img: HTMLCanvasElement; blocked: Uint8Array; lamps: [number, number][]; fountain: [number, number]; pond: { cx: number; cy: number; rx: number; ry: number } };

function buildTerrain(): Terrain {
  const img = mk(W, H);
  const g = img.getContext('2d')!;
  const rand = rng(hash('pawpad-park'));
  const blocked = new Uint8Array(COLS * ROWS);
  const block = (tx: number, ty: number, w = 1, h = 1) => {
    for (let y = ty; y < ty + h; y++) for (let x = tx; x < tx + w; x++) if (x >= 0 && y >= 0 && x < COLS && y < ROWS) blocked[y * COLS + x] = 1;
  };
  const rect = (x: number, y: number, w: number, h: number, col: string) => {
    g.fillStyle = col;
    g.fillRect(x, y, w, h);
  };

  // grass
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      rect(tx * TILE, ty * TILE, TILE, TILE, (tx + ty) % 2 === 0 ? '#5DAE57' : '#58A853');
      for (let i = 0; i < 3; i++) rect(tx * TILE + Math.floor(rand() * 15), ty * TILE + Math.floor(rand() * 14), 1, 2, '#4A9648');
      if (rand() < 0.06) {
        const fx = tx * TILE + 3 + Math.floor(rand() * 9);
        const fy = ty * TILE + 3 + Math.floor(rand() * 9);
        const col = ['#FFFFFF', '#FFD84D', '#FF8FB1', '#B58CFF'][Math.floor(rand() * 4)];
        rect(fx, fy, 1, 1, col);
        rect(fx - 1, fy, 1, 1, col);
        rect(fx + 1, fy, 1, 1, col);
        rect(fx, fy - 1, 1, 1, col);
        rect(fx, fy + 1, 1, 1, col);
        rect(fx, fy, 1, 1, '#FFF3B0');
      }
    }
  }

  // paths
  const path = (tx: number, ty: number, w: number, h: number, base = '#CDBD94') => {
    rect(tx * TILE, ty * TILE, w * TILE, h * TILE, base);
    for (let i = 0; i < w * h * 6; i++) {
      rect(tx * TILE + Math.floor(rand() * w * TILE), ty * TILE + Math.floor(rand() * h * TILE), 2, 1, rand() < 0.5 ? '#BBA97C' : '#DBCEA8');
    }
  };
  path(0, 8, COLS, 1);
  path(14, 0, 2, ROWS);
  path(4, 4, 1, 4);
  path(24, 4, 1, 4);
  path(12, 6, 6, 5, '#BDB7AA'); // plaza
  for (let ty = 6; ty < 11; ty++) for (let tx = 12; tx < 18; tx++) rect(tx * TILE, ty * TILE, TILE, 1, '#A9A397');

  // pond
  const pond = { cx: 5.2 * TILE, cy: 13 * TILE, rx: 3.3 * TILE, ry: 2.3 * TILE };
  for (let y = Math.floor(pond.cy - pond.ry - 4); y < pond.cy + pond.ry + 4; y++) {
    for (let x = Math.floor(pond.cx - pond.rx - 4); x < pond.cx + pond.rx + 4; x++) {
      const d = ((x - pond.cx) / pond.rx) ** 2 + ((y - pond.cy) / pond.ry) ** 2;
      if (d < 1) rect(x, y, 1, 1, d < 0.82 ? '#4DA3D9' : '#3F8FC4');
      else if (d < 1.18) rect(x, y, 1, 1, '#D9CE92');
    }
  }
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    const d = ((tx * TILE + 8 - pond.cx) / (pond.rx + 6)) ** 2 + ((ty * TILE + 8 - pond.cy) / (pond.ry + 6)) ** 2;
    if (d < 1) block(tx, ty);
  }

  // houses: roof from above plus a strip of front wall
  const house = (tx: number, ty: number, tw: number, roof: string) => {
    const x = tx * TILE;
    const y = ty * TILE;
    const w = tw * TILE;
    const roofH = 2 * TILE + 6;
    rect(x - 1, y + 3, w + 2, roofH + 18, 'rgba(0,0,0,0.18)');
    rect(x, y + roofH, w, TILE + 6 - 6, '#EFE6D2'); // wall
    rect(x, y, w, roofH, roof);
    rect(x, y + roofH / 2, w, roofH / 2, mix(roof, '#000000', 0.18)); // shaded half
    rect(x, y + roofH / 2 - 1, w, 2, mix(roof, '#ffffff', 0.35)); // ridge
    for (let i = 0; i < w; i += 4) rect(x + i, y + 2, 1, roofH - 4, mix(roof, '#000000', 0.08));
    rect(x + w - 14, y + 5, 6, 6, '#6B5A52'); // chimney
    rect(x + w - 13, y + 6, 4, 4, '#3B302B');
    rect(x + Math.floor(w / 2) - 3, y + roofH + 4, 6, TILE - 4, '#7A4E2E'); // door
    rect(x + 6, y + roofH + 4, 5, 5, '#8FC6E8');
    rect(x + w - 11, y + roofH + 4, 5, 5, '#8FC6E8');
    rect(x, y + roofH + TILE, w, 1, 'rgba(0,0,0,0.25)');
    block(tx, ty, tw, 3);
  };
  house(2, 1, 5, '#B5543F');
  house(23, 1, 5, '#4F6FA8');
  house(9, 1, 3, '#6B8F4E');

  // trees
  const tree = (tx: number, ty: number) => {
    const cx = tx * TILE + 8;
    const cy = ty * TILE + 8;
    g.fillStyle = 'rgba(0,0,0,0.2)';
    for (let y = -6; y <= 6; y++) for (let x = -11; x <= 11; x++) if ((x / 11) ** 2 + (y / 6) ** 2 < 1) g.fillRect(cx + x + 3, cy + y + 8, 1, 1);
    for (let y = -11; y <= 11; y++) {
      for (let x = -11; x <= 11; x++) {
        const d = Math.hypot(x, y);
        if (d <= 11) {
          let col = '#3F9A4E';
          if (d > 9.4) col = '#2E6B3A';
          else if (x + y > 7) col = '#2F7A40';
          else if (x + y < -6 && d < 8) col = '#58B563';
          g.fillStyle = col;
          g.fillRect(cx + x, cy + y - 3, 1, 1);
        }
      }
    }
    block(tx, ty);
  };
  for (const [tx, ty] of [[1, 6], [7, 6], [11, 3], [19, 3], [20, 5], [27, 6], [20, 12], [25, 14], [28, 11], [1, 10], [10, 15], [12, 13], [18, 14], [22, 9], [7, 10]]) tree(tx, ty);

  // fountain (2x2 tiles at the plaza centre)
  const fx = 14 * TILE + 16;
  const fy = 7 * TILE + 16;
  for (let y = -17; y <= 17; y++) for (let x = -17; x <= 17; x++) {
    const d = Math.hypot(x, y);
    if (d <= 16) {
      g.fillStyle = d > 14 ? '#8D897F' : d > 12 ? '#B5B0A3' : '#5BB0E0';
      g.fillRect(fx + x, fy + y, 1, 1);
    }
  }
  for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) if (Math.hypot(x, y) <= 4) { g.fillStyle = '#C9C5B8'; g.fillRect(fx + x, fy + y, 1, 1); }
  block(14, 7, 2, 2);

  // benches and lamps
  const bench = (tx: number, ty: number) => {
    rect(tx * TILE + 1, ty * TILE + 4, 14, 8, '#7A5638');
    for (let i = 0; i < 4; i++) rect(tx * TILE + 1, ty * TILE + 4 + i * 2, 14, 1, '#9A7048');
    rect(tx * TILE + 1, ty * TILE + 12, 14, 1, 'rgba(0,0,0,0.25)');
    block(tx, ty);
  };
  bench(11, 9);
  bench(18, 7);
  bench(20, 8);
  const lamps: [number, number][] = [[12, 6], [17, 6], [12, 10], [17, 10], [13, 8], [4, 8], [24, 8]];
  for (const [tx, ty] of lamps) {
    rect(tx * TILE + 6, ty * TILE + 6, 4, 4, '#2D2F36');
    rect(tx * TILE + 7, ty * TILE + 7, 2, 2, '#FFE9A0');
  }

  return { img, blocked, lamps, fountain: [fx, fy], pond };
}

/* ------------------------------ the world ------------------------------ */

type PetState = {
  pet: WorldPet;
  tx: number;
  ty: number;
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  toTx: number;
  toTy: number;
  mt: number;
  dir: Dir;
  state: 'move' | 'idle' | 'sleep';
  timer: number;
  phase: number;
  hopY: number;
  hopV: number;
};

export type World = {
  night: boolean;
  setPets(pets: WorldPet[], focusMint?: string): void;
  update(dt: number): void;
  draw(g: CanvasRenderingContext2D): void;
  positions(): { mint: string; x: number; y: number }[];
  hitTest(x: number, y: number): string | null;
  hold(mint: string | null): void;
  hop(mint: string): void;
};

export function createWorld(opts: { hour?: number } = {}): World {
  const hour = opts.hour ?? new Date().getHours();
  const night = hour >= 20 || hour < 6;
  const dusk = (hour >= 17 && hour < 20) || (hour >= 6 && hour < 8);
  const terrain = buildTerrain();
  const rand = rng(Date.now() & 0xffff);

  const pets = new Map<string, PetState>();
  const occ = new Map<number, string>();
  let focus: string | undefined;
  let held: string | null = null;
  let clock = 0;
  const MOVE_T = 0.7;
  const key = (tx: number, ty: number) => ty * COLS + tx;
  const free = (tx: number, ty: number) => tx >= 0 && ty >= 0 && tx < COLS && ty < ROWS && !terrain.blocked[key(tx, ty)] && !occ.has(key(tx, ty));

  function spawnTile(mint: string): [number, number] {
    const start = hash(mint) % (COLS * ROWS);
    for (let i = 0; i < COLS * ROWS; i++) {
      const k = (start + i) % (COLS * ROWS);
      const tx = k % COLS;
      const ty = Math.floor(k / COLS);
      if (free(tx, ty)) return [tx, ty];
    }
    return [0, 0];
  }

  function setPets(list: WorldPet[], focusMint?: string) {
    focus = focusMint;
    const keep = new Set(list.map((p) => p.mint));
    for (const [mint, s] of pets) {
      if (!keep.has(mint)) {
        occ.delete(key(s.tx, s.ty));
        if (s.state === 'move') occ.delete(key(s.toTx, s.toTy));
        pets.delete(mint);
      }
    }
    for (const p of list) {
      const s = pets.get(p.mint);
      if (s) {
        s.pet = p;
        continue;
      }
      const [tx, ty] = spawnTile(p.mint);
      occ.set(key(tx, ty), p.mint);
      pets.set(p.mint, {
        pet: p, tx, ty, x: tx * TILE, y: ty * TILE, fromX: tx * TILE, fromY: ty * TILE, toTx: tx, toTy: ty, mt: 0,
        dir: DIRS[hash(p.mint + 'd') % 4], state: 'idle', timer: rand() * 2, phase: rand() * 2, hopY: 0, hopV: 0,
      });
    }
  }

  function chooseNext(s: PetState) {
    if (rand() < 0.035) {
      s.state = 'sleep';
      s.timer = 4 + rand() * 4;
      return;
    }
    // prefer to keep going the way it was facing
    const order = [...DIRS].sort((a, b) => (b === s.dir ? 1.5 : 0) + rand() - ((a === s.dir ? 1.5 : 0) + rand()));
    for (const d of order) {
      const nx = s.tx + DV[d][0];
      const ny = s.ty + DV[d][1];
      if (free(nx, ny)) {
        s.dir = d;
        s.toTx = nx;
        s.toTy = ny;
        occ.set(key(nx, ny), s.pet.mint);
        s.fromX = s.tx * TILE;
        s.fromY = s.ty * TILE;
        s.mt = 0;
        s.state = 'move';
        return;
      }
    }
    s.state = 'idle';
    s.timer = 0.8 + rand();
  }

  function update(dt: number) {
    clock += dt;
    for (const s of pets.values()) {
      if (s.hopV !== 0 || s.hopY > 0) {
        s.hopV -= 260 * dt;
        s.hopY = Math.max(0, s.hopY + s.hopV * dt);
        if (s.hopY === 0) s.hopV = 0;
      }
      if (held === s.pet.mint) continue;
      if (s.state === 'move') {
        s.mt += dt / MOVE_T;
        if (s.mt >= 1) {
          occ.delete(key(s.tx, s.ty));
          s.tx = s.toTx;
          s.ty = s.toTy;
          s.x = s.tx * TILE;
          s.y = s.ty * TILE;
          s.state = 'idle';
          s.timer = rand() < 0.65 ? 0 : 0.6 + rand() * 3;
        } else {
          s.x = s.fromX + (s.toTx * TILE - s.fromX) * s.mt;
          s.y = s.fromY + (s.toTy * TILE - s.fromY) * s.mt;
        }
      } else {
        s.timer -= dt;
        if (s.timer <= 0) chooseNext(s);
      }
    }
  }

  function hop(mint: string) {
    const s = pets.get(mint);
    if (s && s.hopY === 0) s.hopV = 80;
  }

  function sprite(s: PetState) {
    const set = spritesFor(s.pet.petId, s.pet.look);
    const f = s.state === 'move' ? (Math.floor(s.mt * 2) % 2 === 0 ? 0 : 1) : 2;
    return set[s.dir][f];
  }

  function draw(g: CanvasRenderingContext2D) {
    g.imageSmoothingEnabled = false;
    g.drawImage(terrain.img, 0, 0);

    // water shimmer and fountain sparkles
    const { pond, fountain } = terrain;
    g.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 7; i++) {
      const a = i * 2.1 + clock * 0.4;
      const x = pond.cx + Math.cos(a) * pond.rx * 0.55 * (0.5 + 0.5 * Math.sin(i + clock * 0.3));
      const y = pond.cy + Math.sin(a * 1.3) * pond.ry * 0.5;
      if (Math.sin(clock * 2 + i * 1.7) > 0.2) g.fillRect(Math.round(x), Math.round(y), 3, 1);
    }
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05 + clock * 1.3;
      const r = 4 + ((clock * 7 + i * 3) % 7);
      g.fillStyle = 'rgba(255,255,255,0.8)';
      g.fillRect(Math.round(fountain[0] + Math.cos(a) * r), Math.round(fountain[1] + Math.sin(a) * r), 1, 1);
    }

    // pets, back to front
    const list = [...pets.values()].sort((a, b) => a.y - b.y);
    for (const s of list) {
      const sp = sprite(s);
      const bob = s.state === 'move' && Math.floor(s.mt * 4) % 2 === 1 ? -1 : 0;
      const px = Math.round(s.x) - 1;
      const py = Math.round(s.y) - 1 + bob - Math.round(s.hopY);
      g.fillStyle = 'rgba(0,0,0,0.28)';
      g.fillRect(Math.round(s.x) + 3, Math.round(s.y) + 13, 10, 3);
      g.drawImage(sp, px, py);
      if (s.state === 'sleep') {
        g.fillStyle = '#FFFFFF';
        const t = (clock * 0.8 + s.phase) % 1.6;
        for (let k = 0; k < 2; k++) {
          const tt = (t + k * 0.8) % 1.6;
          const zx = px + 14 + tt * 3;
          const zy = py + 2 - tt * 7;
          g.globalAlpha = Math.max(0, 1 - tt / 1.6);
          g.fillRect(Math.round(zx), Math.round(zy), 3, 1);
          g.fillRect(Math.round(zx) + 2, Math.round(zy) + 1, 1, 1);
          g.fillRect(Math.round(zx) + 1, Math.round(zy) + 2, 1, 1);
          g.fillRect(Math.round(zx), Math.round(zy) + 3, 3, 1);
        }
        g.globalAlpha = 1;
      }
      if (s.hopY > 5) {
        g.fillStyle = '#FF6B8B';
        const hx = px + 12;
        const hy = py - 6;
        g.fillRect(hx, hy, 2, 2);
        g.fillRect(hx + 3, hy, 2, 2);
        g.fillRect(hx, hy + 1, 5, 2);
        g.fillRect(hx + 1, hy + 3, 3, 1);
      }
      if (s.pet.mint === focus) {
        // a bobbing arrow shows which pet belongs to this coin
        const ay = py - 7 + Math.round(Math.sin(clock * 5) * 1.5);
        g.fillStyle = OUT;
        g.fillRect(px + 4, ay - 1, 10, 2);
        g.fillRect(px + 5, ay + 1, 8, 2);
        g.fillRect(px + 6, ay + 3, 6, 2);
        g.fillRect(px + 7, ay + 5, 4, 2);
        g.fillStyle = '#FF7B5C';
        g.fillRect(px + 5, ay, 8, 1);
        g.fillRect(px + 6, ay + 1, 6, 1);
        g.fillRect(px + 7, ay + 2, 4, 1);
        g.fillRect(px + 8, ay + 3, 2, 1);
      }
    }

    // evening and night
    if (night || dusk) {
      g.fillStyle = night ? 'rgba(10,18,60,0.5)' : 'rgba(255,140,70,0.16)';
      g.fillRect(0, 0, W, H);
      for (const [tx, ty] of terrain.lamps) {
        const cx = tx * TILE + 8;
        const cy = ty * TILE + 8;
        const grad = g.createRadialGradient(cx, cy, 1, cx, cy, night ? 28 : 20);
        grad.addColorStop(0, night ? 'rgba(255,225,140,0.38)' : 'rgba(255,225,140,0.22)');
        grad.addColorStop(1, 'rgba(255,225,140,0)');
        g.fillStyle = grad;
        g.fillRect(cx - 36, cy - 36, 72, 72);
      }
    }
  }

  function positions() {
    return [...pets.values()].map((s) => ({ mint: s.pet.mint, x: s.x, y: s.y - Math.round(s.hopY) }));
  }

  function hitTest(x: number, y: number) {
    const list = [...pets.values()].sort((a, b) => b.y - a.y);
    for (const s of list) if (x >= s.x - 2 && x <= s.x + 18 && y >= s.y - 3 && y <= s.y + 18) return s.pet.mint;
    return null;
  }

  return { night, setPets, update, draw, positions, hitTest, hold: (m) => { held = m; }, hop };
}
