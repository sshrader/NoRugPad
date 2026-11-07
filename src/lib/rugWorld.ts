// NoRugPad Arena: the coin's logo defends the liquidity vault from rug pullers, scammers, bots and a boss.
// Pure canvas code with no React, so it can be tested on its own (scripts/rug-test.mjs).
// Everything here is a cartoon. The villains are made-up characters, not real people or projects.

export const BW = 480;
export const BH = 272;
const GY = 214; // ground line (feet)
const VAULT_X = 38;
const HOME = 150; // where the hero waits between dashes

export type Skin = { name: string; symbol: string; image?: CanvasImageSource | null };
export type BattleStats = {
  wave: number;
  rugs: number; // rug pullers stopped
  scams: number; // scammers and bots stopped
  vault: number;
  vaultMax: number;
  meter: number; // 0..100, special move charge
  combo: number;
  heroHp: number;
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
  st: number; // state timer
  state: EState;
  speed: number;
  stand: number; // scammers stop here
  cool: number;
  hurt: number;
  kx: number; // knockback velocity
  say: string;
  sayT: number;
};
type Shot = { x: number; y: number; vx: number; back: boolean; life: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; kind: 'sq' | 'coin' };
type Floater = { x: number; y: number; text: string; life: number; color: string };
type Ring = { x: number; r: number; max: number; kind: 'hero' | 'stomp'; hit: Set<number> };

const RUGGER_SAY = ['Just a little rug...', 'Liquidity is mine!', 'Trust me, bro.', 'Tiny tug. Nobody will notice.', 'Devs are asleep. Probably.'];
const SCAM_SAY = ['FREE AIRDROP! Send seed phrase!', 'DM me for support!', 'Guaranteed 100x!', 'Verify your wallet here!', 'Admin here. Send SOL first.'];
const BOT_SAY = ['bzzt. sniping.', 'beep. bundling.'];
const HURT_SAY = ['Ow!', 'Hey!', 'Not the face!', 'Unfair!'];
const DEAD_SAY = ['Rekt...', 'Liquidity locked?!', 'I should have audited.', 'Noooo!', 'Blocked.'];
const HERO_SAY = ['NO RUG!', 'Not today.', 'Mint revoked. Try again.', 'LP is locked.', 'Diamond hands!', 'Rug denied.', 'Nice try.'];

export function createBattle(opts: { rand?: () => number } = {}) {
  const rand = opts.rand ?? Math.random;
  const rr = (a: number, b: number) => a + (b - a) * rand();
  const pick = <T>(a: T[]): T => a[Math.floor(rand() * a.length) % a.length];

  let skin: Skin = { name: 'Coin', symbol: '$' };
  let time = 0;
  let nextId = 1;

  const hero = {
    x: HOME,
    hp: 100,
    max: 100,
    mode: 'idle' as 'idle' | 'dash',
    target: 0,
    cool: 0.6,
    spin: 0,
    lift: 0,
    hurt: 0,
    slash: 0,
    block: 0,
    face: 1,
    down: 0,
    say: '',
    sayT: 0,
  };

  let enemies: Enemy[] = [];
  let shots: Shot[] = [];
  let parts: Particle[] = [];
  let floats: Floater[] = [];
  let rings: Ring[] = [];

  let vault = 100;
  const VAULT_MAX = 100;
  let meter = 0;
  let combo = 0;
  let comboT = 0;
  let rugs = 0;
  let scams = 0;
  let shake = 0;
  let hitstop = 0;
  const wave = { n: 0, left: 0, spawnT: 0, clearT: 0, cleared: false };
  const banner = { text: '', t: 0, color: '#ffffff' };

  // Decorative city, built once from a tiny fixed generator so it never changes between frames.
  let seed = 12345;
  const lcg = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const stars = Array.from({ length: 46 }, () => ({ x: lcg() * BW, y: lcg() * 120, s: lcg() < 0.2 ? 2 : 1, p: lcg() * 6 }));
  const mkCity = (minH: number, maxH: number, minW: number, maxW: number) => {
    const out: { x: number; w: number; h: number; win: number }[] = [];
    let x = 0;
    while (x < BW) {
      const w = Math.floor(minW + lcg() * (maxW - minW));
      out.push({ x, w, h: Math.floor(minH + lcg() * (maxH - minH)), win: Math.floor(lcg() * 1000) });
      x += w + 1;
    }
    return out;
  };
  const farCity = mkCity(40, 100, 22, 40);
  const nearCity = mkCity(24, 70, 26, 48);

  /* ------------------------------ helpers ------------------------------ */

  const say = (who: { say: string; sayT: number }, text: string, secs = 2.2) => {
    who.say = text;
    who.sayT = secs;
  };
  const float = (x: number, y: number, text: string, color = '#ffffff') => floats.push({ x, y, text, life: 1.1, color });
  const burst = (x: number, y: number, n: number, colors: string[], kind: 'sq' | 'coin' = 'sq', power = 90) => {
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2;
      const sp = rr(0.3, 1) * power;
      parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: rr(0.4, 0.9), max: 0.9, color: pick(colors), size: kind === 'coin' ? 3 : rr(1.5, 3), kind });
    }
  };
  const showBanner = (text: string, color = '#ffffff', secs = 1.8) => {
    banner.text = text;
    banner.t = secs;
    banner.color = color;
  };
  const liveEnemies = () => enemies.filter((e) => e.state !== 'dying' && e.state !== 'flee');

  /* ------------------------------ waves ------------------------------ */

  function spawn(kind: Kind) {
    const base = { speed: 0, hp: 0 };
    if (kind === 'rugger') {
      base.speed = Math.min(50, 24 + wave.n * 2);
      base.hp = 30 + wave.n * 2;
    } else if (kind === 'scammer') {
      base.speed = 26;
      base.hp = 26 + wave.n * 2;
    } else if (kind === 'bot') {
      base.speed = 64;
      base.hp = 12;
    } else {
      base.speed = 13;
      base.hp = 150 + wave.n * 14;
    }
    const e: Enemy = {
      id: nextId++,
      kind,
      x: BW + rr(16, 46),
      y: kind === 'bot' ? GY - 72 + rr(-8, 14) : GY,
      hp: base.hp,
      max: base.hp,
      t: rr(0, 6),
      st: 0,
      state: 'walk',
      speed: base.speed,
      stand: rr(250, 340),
      cool: rr(0.6, 1.4),
      hurt: 0,
      kx: 0,
      say: '',
      sayT: 0,
    };
    if (kind === 'boss') e.cool = 2.6;
    if (rand() < 0.35) say(e, kind === 'scammer' ? pick(SCAM_SAY) : kind === 'bot' ? pick(BOT_SAY) : pick(RUGGER_SAY));
    enemies.push(e);
  }

  function startWave() {
    wave.n++;
    wave.cleared = false;
    const boss = wave.n % 4 === 0;
    wave.left = Math.min(14, 3 + wave.n) - (boss ? 2 : 0);
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
    if (e.kind === 'rugger' || e.kind === 'boss') {
      rugs++;
      float(e.x, e.y - 40, e.kind === 'boss' ? 'BOSS DOWN!' : 'RUG STOPPED', '#5eddb4');
    } else {
      scams++;
      float(e.x, e.y - 40, e.kind === 'scammer' ? 'SCAM BLOCKED' : 'BOT SMASHED', '#5eddb4');
    }
    meter = Math.min(100, meter + 14);
    shake = Math.max(shake, e.kind === 'boss' ? 10 : 4);
    burst(e.x, e.y - 14, e.kind === 'boss' ? 36 : 14, ['#ffd36b', '#fff6c8', '#ff6b7a'], 'coin', 120);
    if (rand() < 0.6) say(e, pick(DEAD_SAY), 0.6);
    if (e.kind === 'boss') showBanner('MEGA RUGGER DOWN!', '#5eddb4', 2.2);
    if (rand() < 0.4 && hero.sayT <= 0) say(hero, pick(HERO_SAY), 1.4);
  }

  function damage(e: Enemy, dmg: number, kx: number) {
    if (e.state === 'dying') return;
    e.hp -= dmg;
    e.hurt = 0.2;
    e.kx = e.kind === 'boss' ? kx * 0.2 : kx;
    float(e.x, e.y - 34, String(Math.round(dmg)), '#ffd36b');
    burst(e.x, e.y - 16, 7, ['#ffffff', '#ffd36b', '#b5a9ff']);
    shake = Math.max(shake, 3);
    hitstop = 0.05;
    combo++;
    comboT = 3;
    meter = Math.min(100, meter + 7);
    if (e.hp <= 0) kill(e);
    else if (rand() < 0.25 && e.sayT <= 0) say(e, pick(HURT_SAY), 0.9);
  }

  function chooseTarget(): Enemy | null {
    let best: Enemy | null = null;
    let bs = 1e9;
    for (const e of enemies) {
      if (e.state === 'dying' || e.state === 'flee') continue;
      let s = e.x;
      if (e.state === 'pull') s -= 600; // the ones tugging the rug come first
      if (s < bs) {
        bs = s;
        best = e;
      }
    }
    return best;
  }

  function unleash(): boolean {
    if (meter < 100 || hero.down > 0) return false;
    meter = 0;
    rings.push({ x: hero.x, r: 0, max: 440, kind: 'hero', hit: new Set() });
    shake = 10;
    showBanner('DIAMOND HANDS!', '#b5a9ff', 1.4);
    say(hero, 'NO RUG!!', 1.6);
    burst(hero.x, GY - 28, 26, ['#b5a9ff', '#ffffff', '#ffd36b'], 'sq', 160);
    return true;
  }

  /* ------------------------------ update ------------------------------ */

  function update(rawDt: number) {
    let dt = Math.min(0.1, Math.max(0, rawDt));
    if (hitstop > 0) {
      hitstop -= dt;
      dt *= 0.12;
    }
    time += dt;
    shake = Math.max(0, shake - dt * 22);
    banner.t -= dt;
    hero.sayT -= dt;
    comboT -= dt;
    if (comboT <= 0) combo = 0;

    // waves
    if (wave.n === 0) startWave();
    wave.spawnT -= dt;
    if (wave.left > 0 && wave.spawnT <= 0 && enemies.length < 8) {
      const r = rand();
      spawn(r < 0.5 ? 'rugger' : r < 0.8 ? 'scammer' : 'bot');
      wave.left--;
      wave.spawnT = rr(0.9, 1.8);
    }
    if (wave.left === 0 && enemies.length === 0) {
      if (!wave.cleared) {
        wave.cleared = true;
        wave.clearT = 2.2;
        showBanner('WAVE CLEARED', '#5eddb4', 2);
        vault = Math.min(VAULT_MAX, vault + 15);
      }
      wave.clearT -= dt;
      if (wave.clearT <= 0) startWave();
    }

    // vault
    vault = Math.min(VAULT_MAX, vault + 1.2 * dt);
    if (vault <= 0) {
      vault = 40;
      meter = 100;
      showBanner('LIQUIDITY SAVED AT THE LAST SECOND', '#ffd36b', 2.2);
      for (const e of enemies) if (e.state !== 'dying') e.state = 'flee';
    }

    // hero
    hero.cool -= dt;
    hero.slash -= dt;
    hero.block -= dt;
    hero.hurt = Math.max(0, hero.hurt - dt);
    if (hero.down > 0) {
      hero.down -= dt;
      hero.mode = 'idle';
      hero.lift = 0;
      if (hero.down <= 0) hero.hp = 60;
    } else {
      hero.hp = Math.min(hero.max, hero.hp + 2.5 * dt);
      const tgt = enemies.find((e) => e.id === hero.target && e.state !== 'dying' && e.state !== 'flee');
      if (hero.mode === 'dash') {
        if (!tgt) {
          hero.mode = 'idle';
        } else {
          const dx = tgt.x - hero.x;
          hero.face = dx >= 0 ? 1 : -1;
          hero.x += Math.sign(dx) * Math.min(Math.abs(dx), 280 * dt);
          hero.spin += dt * 20 * hero.face;
          hero.lift = tgt.kind === 'bot' ? 40 : 10 + Math.sin(time * 30) * 2;
          if (Math.abs(dx) <= 26) {
            hero.slash = 0.25;
            hero.mode = 'idle';
            hero.cool = 0.4;
            damage(tgt, 14 + Math.min(combo, 12) * 1.5, hero.face * 160);
            if (rand() < 0.3 && hero.sayT <= 0) say(hero, pick(HERO_SAY), 1.2);
          }
        }
      } else {
        hero.spin *= Math.max(0, 1 - dt * 9);
        hero.lift = Math.max(0, hero.lift - 140 * dt);
        const t = hero.cool <= 0 ? chooseTarget() : null;
        if (t) {
          hero.target = t.id;
          hero.mode = 'dash';
        } else {
          const dx = HOME - hero.x;
          hero.face = dx >= 0 ? 1 : -1;
          hero.x += Math.sign(dx) * Math.min(Math.abs(dx), 150 * dt);
          if (Math.abs(dx) < 2) hero.face = 1;
        }
      }
      if (meter >= 100 && liveEnemies().length >= 3) unleash();
    }
    if (hero.hp <= 0 && hero.down <= 0) {
      hero.down = 2.4;
      hero.hp = 0;
      shake = 6;
      showBanner('COIN DOWN! GETTING UP...', '#ff6b7a', 2);
      float(hero.x, GY - 50, 'KO', '#ff6b7a');
    }

    // enemies
    for (const e of enemies) {
      e.t += dt;
      e.hurt = Math.max(0, e.hurt - dt);
      e.sayT -= dt;
      if (e.kx) {
        e.x += e.kx * dt;
        e.kx *= Math.max(0, 1 - dt * 6);
        if (Math.abs(e.kx) < 4) e.kx = 0;
      }
      if (e.state === 'dying') {
        e.st -= dt;
        continue;
      }
      if (e.kind === 'bot' && e.state !== 'flee') e.y = GY - 72 + Math.sin(e.t * 3) * 8;
      if (e.state === 'walk') {
        e.x -= e.speed * dt;
        if (e.kind === 'scammer') {
          if (e.x <= e.stand) e.state = 'aim';
        } else {
          const reach = e.kind === 'boss' ? 66 : e.kind === 'bot' ? 44 : 38;
          if (e.x <= VAULT_X + reach) {
            e.state = 'pull';
            e.st = e.kind === 'boss' ? 3.6 : 1.9;
            if (e.kind === 'rugger') say(e, pick(RUGGER_SAY), 1.6);
          }
        }
        if (e.kind === 'boss') {
          e.cool -= dt;
          if (e.cool <= 0) {
            e.cool = 3.4;
            rings.push({ x: e.x, r: 0, max: 100, kind: 'stomp', hit: new Set() });
            shake = Math.max(shake, 5);
          }
        }
      } else if (e.state === 'pull') {
        if (e.kind === 'bot') {
          vault -= 2.6 * dt;
        } else {
          e.st -= dt;
          if (e.st <= 0) {
            const amt = e.kind === 'boss' ? 35 : 14;
            vault -= amt;
            float(VAULT_X, GY - 60, `-${amt} LP`, '#ff6b7a');
            say(e, 'RUG!', 1.2);
            shake = Math.max(shake, 5);
            burst(VAULT_X + 10, GY - 16, 14, ['#ffd36b', '#ff6b7a'], 'coin', 110);
            e.state = 'flee';
          }
        }
      } else if (e.state === 'aim') {
        e.cool -= dt;
        if (e.cool <= 0) {
          e.cool = rr(1.8, 2.8);
          shots.push({ x: e.x - 10, y: GY - 28, vx: -(120 + wave.n * 3), back: false, life: 5 });
          if (rand() < 0.3) say(e, pick(SCAM_SAY), 1.6);
        }
      } else if (e.state === 'flee') {
        e.x += 95 * dt;
      }
    }
    enemies = enemies.filter((e) => !(e.state === 'dying' && e.st <= 0) && !(e.state === 'flee' && e.x > BW + 40));

    // shots
    for (const s of shots) {
      s.x += s.vx * dt;
      s.life -= dt;
      if (!s.back) {
        const near = Math.abs(s.x - hero.x) < 24 && Math.abs(s.y - (GY - hero.lift - 26)) < 26;
        if (near && hero.down <= 0) {
          if (hero.mode === 'dash' || rand() < 0.6) {
            s.back = true;
            s.vx = Math.abs(s.vx) * 1.5;
            hero.block = 0.25;
            float(hero.x, GY - 62, 'DEFLECT!', '#8bd0ff');
            burst(s.x, s.y, 8, ['#8bd0ff', '#ffffff']);
          } else {
            s.life = 0;
            hero.hp -= 7;
            hero.hurt = 0.25;
            float(hero.x, GY - 62, '-7', '#ff6b7a');
            burst(s.x, s.y, 6, ['#ff6b7a', '#ffffff']);
          }
        } else if (s.x < VAULT_X + 14) {
          s.life = 0;
          vault -= 4;
          float(VAULT_X, GY - 60, 'PHISHED -4', '#ff6b7a');
        }
      } else {
        for (const e of enemies) {
          if (e.state === 'dying' || e.state === 'flee') continue;
          if (Math.abs(s.x - e.x) < 18 && Math.abs(s.y - (e.y - (e.kind === 'bot' ? 8 : 22))) < 30) {
            s.life = 0;
            damage(e, 22, 120);
            break;
          }
        }
      }
    }
    shots = shots.filter((s) => s.life > 0 && s.x > -20 && s.x < BW + 40);

    // rings
    for (const r of rings) {
      if (r.kind === 'hero') {
        r.r += 440 * dt;
        for (const e of enemies) {
          if (e.state === 'dying' || r.hit.has(e.id)) continue;
          if (Math.abs(e.x - r.x) <= r.r) {
            r.hit.add(e.id);
            if (e.state === 'flee') e.hp = 0;
            damage(e, 45, (e.x >= r.x ? 1 : -1) * 220);
          }
        }
        for (const s of shots) if (!s.back && Math.abs(s.x - r.x) <= r.r) s.life = 0;
      } else {
        r.r += 200 * dt;
        if (!r.hit.has(-1) && hero.mode !== 'dash' && hero.down <= 0 && Math.abs(hero.x - r.x) <= r.r) {
          r.hit.add(-1);
          hero.hp -= 10;
          hero.hurt = 0.25;
          float(hero.x, GY - 62, '-10', '#ff6b7a');
        }
      }
    }
    rings = rings.filter((r) => r.r < r.max);

    for (const p of parts) {
      p.life -= dt;
      p.vy += 260 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    parts = parts.filter((p) => p.life > 0 && p.y < BH + 10);
    for (const f of floats) {
      f.life -= dt;
      f.y -= 16 * dt;
    }
    floats = floats.filter((f) => f.life > 0);
  }

  /* ------------------------------ drawing ------------------------------ */

  const px = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) => {
    g.fillStyle = c;
    g.fillRect(Math.round(x), Math.round(y), w, h);
  };

  function drawBackground(g: CanvasRenderingContext2D) {
    const sky = g.createLinearGradient(0, 0, 0, GY);
    sky.addColorStop(0, '#080b24');
    sky.addColorStop(0.6, '#1b1442');
    sky.addColorStop(1, '#4a2160');
    g.fillStyle = sky;
    g.fillRect(0, 0, BW, BH);
    for (const s of stars) {
      g.globalAlpha = 0.5 + 0.5 * Math.sin(time * 2 + s.p);
      px(g, s.x, s.y, s.s, s.s, '#ffffff');
    }
    g.globalAlpha = 1;
    // moon
    g.fillStyle = '#f4f0d0';
    g.beginPath();
    g.arc(396, 46, 17, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#1b1442';
    g.beginPath();
    g.arc(404, 42, 15, 0, Math.PI * 2);
    g.fill();
    // far skyline, slow drift
    const layer = (city: typeof farCity, speed: number, color: string, lit: string) => {
      const off = (time * speed) % BW;
      for (const b of city) {
        for (const shift of [0, BW]) {
          const bx = Math.round(b.x - off + shift);
          if (bx > BW || bx + b.w < 0) continue;
          px(g, bx, GY - b.h, b.w, b.h, color);
          for (let wy = GY - b.h + 5; wy < GY - 6; wy += 9) {
            for (let wx = bx + 4; wx < bx + b.w - 4; wx += 7) {
              if (((wx * 7 + wy * 13 + b.win) % 5) < 2) px(g, wx, wy, 2, 3, lit);
            }
          }
        }
      }
    };
    layer(farCity, 2, '#161a40', '#3b3f7a');
    layer(nearCity, 5, '#0f1233', '#ffd36b');
    // ground
    px(g, 0, GY, BW, BH - GY, '#1b1530');
    px(g, 0, GY, BW, 2, '#8b7bff');
    g.globalAlpha = 0.35;
    px(g, 0, GY + 2, BW, 3, '#8b7bff');
    g.globalAlpha = 1;
    for (let i = 0; i < 20; i++) px(g, ((i * 29 - time * 14) % BW + BW) % BW, GY + 14 + (i % 3) * 10, 12, 1, '#2f2552');
  }

  function drawVault(g: CanvasRenderingContext2D) {
    const x = VAULT_X;
    const ratio = Math.max(0, vault) / VAULT_MAX;
    const glow = 0.25 + 0.15 * Math.sin(time * 3);
    g.globalAlpha = glow + (ratio < 0.3 ? 0.2 : 0);
    g.fillStyle = ratio < 0.3 ? '#ff6b7a' : '#8b7bff';
    g.beginPath();
    g.ellipse(x, GY - 20, 30, 34, 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
    px(g, x - 15, GY - 36, 30, 36, '#2d3a5e');
    px(g, x - 15, GY - 36, 30, 3, '#ffd36b');
    px(g, x - 15, GY - 3, 30, 3, '#ffd36b');
    px(g, x - 15, GY - 36, 3, 36, '#ffd36b');
    px(g, x + 12, GY - 36, 3, 36, '#ffd36b');
    g.fillStyle = '#ffd36b';
    g.beginPath();
    g.arc(x, GY - 20, 8, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#2d3a5e';
    g.font = 'bold 8px monospace';
    g.textAlign = 'center';
    g.fillText('LP', x, GY - 17);
    // bar
    px(g, x - 19, GY - 52, 38, 5, '#0c1315');
    px(g, x - 18, GY - 51, Math.round(36 * ratio), 3, ratio < 0.3 ? '#ff6b7a' : '#5eddb4');
    g.fillStyle = '#e8eeeb';
    g.font = 'bold 7px monospace';
    g.fillText('LIQUIDITY', x, GY - 56);
  }

  function drawHero(g: CanvasRenderingContext2D) {
    const x = hero.x;
    const base = GY - hero.lift;
    // shadow
    g.globalAlpha = 0.35;
    g.fillStyle = '#000';
    g.beginPath();
    g.ellipse(x, GY + 2, Math.max(6, 16 - hero.lift * 0.2), 3, 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
    g.save();
    g.translate(x, base);
    if (hero.down > 0) {
      g.globalAlpha = 0.65;
      g.rotate(0.9 * (hero.face || 1));
      g.translate(0, 8);
    }
    const f = hero.face || 1;
    // cape
    const flap = Math.sin(time * 9) * 3 + (hero.mode === 'dash' ? 8 : 0);
    g.fillStyle = '#8b7bff';
    g.beginPath();
    g.moveTo(-f * 8, -34);
    g.lineTo(-f * (22 + flap), -10 + flap * 0.3);
    g.lineTo(-f * 6, -12);
    g.closePath();
    g.fill();
    // legs
    const run = hero.mode === 'dash' ? Math.sin(time * 40) * 3 : 0;
    px(g, -6, -10, 4, 10 + run, '#1b1530');
    px(g, 2, -10, 4, 10 - run, '#1b1530');
    px(g, -7, -1 + run, 6, 2, '#e8eeeb');
    px(g, 1, -1 - run, 6, 2, '#e8eeeb');
    // the logo, spinning when dashing
    g.save();
    g.translate(0, -30);
    g.rotate(hero.spin);
    g.beginPath();
    g.arc(0, 0, 17, 0, Math.PI * 2);
    g.save();
    g.clip();
    const im = skin.image;
    const ready = !!im && (typeof HTMLImageElement === 'undefined' || !(im instanceof HTMLImageElement) || (im.complete && im.naturalWidth > 0));
    if (im && ready) {
      g.drawImage(im, -17, -17, 34, 34);
    } else {
      g.fillStyle = '#ffd36b';
      g.fillRect(-17, -17, 34, 34);
      g.fillStyle = '#b8862b';
      g.font = 'bold 18px monospace';
      g.textAlign = 'center';
      g.fillText((skin.symbol || '$').slice(0, 1).toUpperCase(), 0, 6);
    }
    g.restore();
    g.restore();
    g.lineWidth = 3;
    g.strokeStyle = hero.hurt > 0 ? '#ff6b7a' : '#ffd36b';
    g.beginPath();
    g.arc(0, -30, 17.5, 0, Math.PI * 2);
    g.stroke();
    // sword
    g.save();
    g.translate(f * 15, -24);
    const sw = hero.slash > 0 ? f * (-1.4 + (1 - hero.slash / 0.25) * 2.8) : f * 0.5;
    g.rotate(sw);
    px(g, -1, -22, 3, 20, '#e8eeeb');
    px(g, -1, -22, 3, 3, '#ffffff');
    px(g, -4, -3, 9, 3, '#ffd36b');
    px(g, -1, 0, 3, 5, '#8b4a1f');
    g.restore();
    // shield flash
    if (hero.block > 0) {
      g.globalAlpha = Math.min(1, hero.block * 5);
      g.strokeStyle = '#8bd0ff';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(f * 8, -28, 22, -1.2, 1.2);
      g.stroke();
      g.globalAlpha = 1;
    }
    g.restore();
    // hp bar
    if (hero.hp < hero.max || hero.down > 0) {
      px(g, x - 15, base - 56, 30, 4, '#0c1315');
      px(g, x - 14, base - 55, Math.round(28 * Math.max(0, hero.hp / hero.max)), 2, '#5eddb4');
    }
  }

  function drawRugger(g: CanvasRenderingContext2D, e: Enemy, boss: boolean) {
    const sw = Math.sin(e.t * 8) * 2;
    const walking = e.state === 'walk' || e.state === 'flee';
    px(g, -5, -7, 3, 7 + (walking ? sw : 0), '#150f26');
    px(g, 2, -7, 3, 7 - (walking ? sw : 0), '#150f26');
    px(g, -8, -22, 16, 16, '#2b2146');
    px(g, -6, -20, 12, 3, '#3a2d5e');
    px(g, -7, -31, 14, 10, '#2b2146');
    px(g, -5, -28, 10, 6, '#0c0816');
    px(g, -4, -26, 2, 2, '#ff4d5e');
    px(g, 1, -26, 2, 2, '#ff4d5e');
    if (boss) {
      px(g, -6, -36, 12, 4, '#ffd36b');
      px(g, -6, -39, 2, 3, '#ffd36b');
      px(g, -1, -40, 2, 4, '#ffd36b');
      px(g, 4, -39, 2, 3, '#ffd36b');
      px(g, 4, -20, 9, 9, '#c9922e');
      g.fillStyle = '#fff6c8';
      g.font = 'bold 7px monospace';
      g.textAlign = 'center';
      g.fillText('$', 8, -13);
    }
    if (e.state === 'pull') {
      // unrolled rug stretched toward the vault, tugged back and forth
      const len = Math.min(e.x - VAULT_X - 12, boss ? 90 : 62);
      const tug = Math.sin(e.t * 14) * 2;
      for (let i = 0; i < len; i += 6) px(g, -len + i - 6 + tug, -4, 6, 4, (i / 6) % 2 === 0 ? '#c0394b' : '#ffd36b');
      px(g, -4, -22, 3, 3, '#c0394b');
    } else {
      px(g, 5, -27, 5, 19, '#c0394b');
      px(g, 5, -27, 5, 2, '#ffd36b');
      px(g, 5, -10, 5, 2, '#ffd36b');
    }
  }

  function drawScammer(g: CanvasRenderingContext2D, e: Enemy) {
    const sw = e.state === 'walk' ? Math.sin(e.t * 8) * 2 : 0;
    px(g, -5, -8, 4, 8 + sw, '#2a3145');
    px(g, 1, -8, 4, 8 - sw, '#2a3145');
    px(g, -7, -25, 14, 18, '#46506a');
    px(g, -2, -25, 4, 11, '#ffffff');
    px(g, -1, -24, 2, 9, '#e0344b');
    px(g, -5, -35, 10, 10, '#f2c9a0');
    px(g, -5, -36, 10, 3, '#2b2b2b');
    px(g, -5, -32, 10, 3, '#101010');
    px(g, -3, -27, 6, 1, '#ffffff');
    px(g, -3, -26, 6, 1, '#5eddb4');
    px(g, 6, -11, 9, 7, '#7a4a2b');
    px(g, 9, -13, 3, 2, '#7a4a2b');
    // sign
    const bob = Math.sin(e.t * 4) * 1.5;
    px(g, -13, -50 + bob, 1, 26, '#b88a4a');
    px(g, -34, -56 + bob, 42, 13, '#fff6c8');
    px(g, -34, -56 + bob, 42, 1, '#c0394b');
    px(g, -34, -44 + bob, 42, 1, '#c0394b');
    g.fillStyle = '#c0394b';
    g.font = 'bold 7px monospace';
    g.textAlign = 'center';
    g.fillText('FREE $$$', -13, -47 + bob);
  }

  function drawBot(g: CanvasRenderingContext2D, e: Enemy) {
    px(g, -6, -8, 12, 10, '#ff6b7a');
    px(g, -6, -8, 12, 2, '#ffa0aa');
    px(g, -3, -6, 6, 5, '#ffffff');
    px(g, -1, -5, 3, 3, '#101010');
    px(g, 0, -13, 1, 5, '#ffffff');
    px(g, -1, -15, 3, 2, '#ffd36b');
    g.globalAlpha = 0.5 + 0.5 * Math.sin(e.t * 50);
    px(g, -10, -12, 20, 1, '#e8eeeb');
    g.globalAlpha = 1;
    px(g, -2, 2, 4, 2 + (Math.sin(e.t * 30) > 0 ? 1 : 0), '#ffb347');
  }

  function drawEnemy(g: CanvasRenderingContext2D, e: Enemy) {
    g.save();
    const jitter = e.hurt > 0 ? (Math.sin(e.t * 90) > 0 ? 1.5 : -1.5) : 0;
    g.translate(Math.round(e.x + jitter), Math.round(e.y));
    const scale = e.kind === 'boss' ? 2.1 : 1;
    if (e.state === 'dying') {
      const k = Math.max(0, e.st / 0.5);
      g.globalAlpha = k;
      g.rotate((1 - k) * 1.3);
    }
    // sprites face left; mirror them while fleeing
    if (e.state === 'flee') g.scale(-1, 1);
    g.scale(scale, scale);
    if (e.kind === 'scammer') drawScammer(g, e);
    else if (e.kind === 'bot') drawBot(g, e);
    else drawRugger(g, e, e.kind === 'boss');
    g.restore();
    g.globalAlpha = 1;
    if (e.state === 'dying') return;
    const top = e.kind === 'boss' ? e.y - 88 : e.kind === 'scammer' ? e.y - 62 : e.kind === 'bot' ? e.y - 22 : e.y - 38;
    const w = e.kind === 'boss' ? 46 : 22;
    px(g, e.x - w / 2 - 1, top - 1, w + 2, 4, '#0c1315');
    px(g, e.x - w / 2, top, Math.round(w * Math.max(0, e.hp / e.max)), 2, e.kind === 'boss' ? '#ff6b7a' : '#ffb347');
    if (e.state === 'pull' && e.kind !== 'bot') {
      const total = e.kind === 'boss' ? 3.6 : 1.9;
      px(g, e.x - 12, top - 6, 24, 3, '#0c1315');
      px(g, e.x - 11, top - 5, Math.round(22 * (1 - Math.max(0, e.st) / total)), 1, '#ff4d5e');
    }
  }

  function bubble(g: CanvasRenderingContext2D, x: number, y: number, text: string, hot: boolean) {
    g.font = 'bold 8px monospace';
    g.textAlign = 'left';
    const w = Math.ceil(g.measureText(text).width) + 8;
    const bx = Math.max(3, Math.min(BW - w - 3, Math.round(x - w / 2)));
    const by = Math.max(3, Math.round(y - 12));
    g.fillStyle = hot ? '#ffffff' : '#fff6c8';
    g.fillRect(bx, by, w, 12);
    g.fillStyle = hot ? '#ffffff' : '#fff6c8';
    g.fillRect(Math.round(x) - 2, by + 12, 4, 3);
    g.fillStyle = '#16122b';
    g.fillText(text, bx + 4, by + 9);
  }

  function draw(g: CanvasRenderingContext2D) {
    g.save();
    g.imageSmoothingEnabled = false;
    if (shake > 0.3) g.translate(Math.round(rr(-shake, shake) * 0.5), Math.round(rr(-shake, shake) * 0.5));
    drawBackground(g);
    drawVault(g);
    const order = [...enemies].sort((a, b) => a.y - b.y);
    for (const e of order) drawEnemy(g, e);
    // shots
    for (const s of shots) {
      px(g, s.x - 8, s.y - 5, 16, 10, s.back ? '#8bd0ff' : '#fff6c8');
      px(g, s.x - 8, s.y - 5, 16, 2, s.back ? '#3a7fb8' : '#c0394b');
      g.fillStyle = s.back ? '#16365a' : '#c0394b';
      g.font = 'bold 6px monospace';
      g.textAlign = 'center';
      g.fillText('LINK', s.x, s.y + 3);
    }
    drawHero(g);
    for (const r of rings) {
      g.globalAlpha = Math.max(0, 1 - r.r / r.max);
      g.lineWidth = r.kind === 'hero' ? 4 : 3;
      g.strokeStyle = r.kind === 'hero' ? '#b5a9ff' : '#ff6b7a';
      g.beginPath();
      g.ellipse(r.x, r.kind === 'hero' ? GY - 24 : GY, r.r, r.kind === 'hero' ? r.r * 0.45 : r.r * 0.25, 0, 0, Math.PI * 2);
      g.stroke();
      g.globalAlpha = 1;
    }
    for (const p of parts) {
      g.globalAlpha = Math.max(0, Math.min(1, p.life / p.max));
      g.fillStyle = p.color;
      if (p.kind === 'coin') {
        g.beginPath();
        g.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        g.fill();
      } else {
        g.fillRect(Math.round(p.x), Math.round(p.y), Math.ceil(p.size), Math.ceil(p.size));
      }
    }
    g.globalAlpha = 1;
    g.font = 'bold 9px monospace';
    g.textAlign = 'center';
    for (const f of floats) {
      g.globalAlpha = Math.min(1, f.life * 2);
      g.fillStyle = '#000000';
      g.fillText(f.text, f.x + 1, f.y + 1);
      g.fillStyle = f.color;
      g.fillText(f.text, f.x, f.y);
    }
    g.globalAlpha = 1;
    // speech (hero first, at most three at a time)
    let shown = 0;
    if (hero.sayT > 0 && hero.say) {
      bubble(g, hero.x, GY - hero.lift - 62, hero.say, true);
      shown++;
    }
    for (const e of enemies) {
      if (shown >= 3) break;
      if (e.sayT > 0 && e.say && e.x < BW - 10) {
        const top = e.kind === 'boss' ? e.y - 96 : e.kind === 'scammer' ? e.y - 70 : e.kind === 'bot' ? e.y - 28 : e.y - 46;
        bubble(g, e.x, top, e.say, false);
        shown++;
      }
    }
    g.restore();
    drawHud(g);
  }

  function drawHud(g: CanvasRenderingContext2D) {
    g.textAlign = 'left';
    g.font = 'bold 8px monospace';
    g.fillStyle = 'rgba(12,19,21,0.7)';
    g.fillRect(6, 6, 96, 14);
    g.fillStyle = '#b5a9ff';
    g.fillText('NORUGPAD ARENA', 11, 16);
    g.textAlign = 'right';
    g.fillStyle = 'rgba(12,19,21,0.7)';
    g.fillRect(BW - 66, 6, 60, 14);
    g.fillStyle = '#e8eeeb';
    g.fillText(`WAVE ${Math.max(1, wave.n)}`, BW - 11, 16);
    g.textAlign = 'center';
    if (combo >= 3) {
      g.font = 'bold 12px monospace';
      g.fillStyle = '#000';
      g.fillText(`x${combo} COMBO`, BW / 2 + 1, 25);
      g.fillStyle = '#ffd36b';
      g.fillText(`x${combo} COMBO`, BW / 2, 24);
    }
    // special meter
    const full = meter >= 100;
    px(g, BW / 2 - 61, BH - 14, 122, 8, '#0c1315');
    px(g, BW / 2 - 60, BH - 13, Math.round(120 * (meter / 100)), 6, full && Math.floor(time * 6) % 2 === 0 ? '#ffffff' : '#b5a9ff');
    g.font = 'bold 7px monospace';
    g.fillStyle = '#e8eeeb';
    g.fillText(full ? 'TAP FOR DIAMOND HANDS' : 'DIAMOND HANDS', BW / 2, BH - 17);
    if (banner.t > 0) {
      g.globalAlpha = Math.min(1, banner.t * 2);
      g.font = 'bold 16px monospace';
      g.fillStyle = '#000';
      g.fillText(banner.text, BW / 2 + 1, 71);
      g.fillStyle = banner.color;
      g.fillText(banner.text, BW / 2, 70);
      g.globalAlpha = 1;
    }
  }

  return {
    update,
    draw,
    unleash,
    setSkin(s: Skin) {
      skin = s;
    },
    stats(): BattleStats {
      return { wave: Math.max(1, wave.n), rugs, scams, vault: Math.max(0, Math.round(vault)), vaultMax: VAULT_MAX, meter: Math.round(meter), combo, heroHp: Math.round(hero.hp) };
    },
    ready() {
      return meter >= 100 && hero.down <= 0;
    },
  };
}

export type Battle = ReturnType<typeof createBattle>;
