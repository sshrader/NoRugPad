// The cats' lore diaries. A background loop writes a new entry for each coin every so often.
import crypto from 'node:crypto';
import * as store from './store.mjs';
import { PETS } from './pets.mjs';
import { writePost } from './petbrain.mjs';

const MAX_PER_COIN = 50;
const baseGapMs = () => Math.max(1, Number(process.env.CAT_POST_MINUTES || 30)) * 60_000;

// Each coin waits between 0.5x and 1.5x the base gap, picked from its mint so cats do not post in sync.
const gapFor = (mint, count) => baseGapMs() * (0.5 + crypto.createHash('sha256').update(`${mint}:${count}`).digest()[0] / 255);

export async function makePost(coin) {
  const all = await store.get('posts.json', {});
  const recent = all[coin.mint] ?? [];
  const cat = coin.cat ?? PETS[0];
  const chapter = recent.length ? recent[0].chapter + 1 : 1;
  const out = await writePost({ coin, cat, recent: recent.slice(0, 3), chapter });
  const post = {
    id: crypto.randomUUID(),
    mint: coin.mint,
    symbol: coin.symbol,
    coinName: coin.name,
    catId: cat.id,
    catName: cat.name,
    voice: cat.voice,
    text: out.text,
    ts: Date.now(),
    chapter,
    source: out.source,
    model: out.model ?? null,
  };
  await store.update('posts.json', {}, (cur) => ({ ...cur, [coin.mint]: [post, ...(cur[coin.mint] ?? [])].slice(0, MAX_PER_COIN) }));
  return post;
}

let running = false;

// Writes entries for any coin that is due. At most two per pass, so a restart never floods the model.
export async function tick() {
  if (running) return 0;
  running = true;
  let made = 0;
  try {
    const coins = await store.get('coins.json', []);
    const posts = await store.get('posts.json', {});
    const now = Date.now();
    for (const coin of coins) {
      const list = posts[coin.mint] ?? [];
      const last = list[0]?.ts ?? coin.createdAt;
      if (now - last < gapFor(coin.mint, list.length)) continue;
      try {
        await makePost(coin);
        made += 1;
      } catch (e) {
        console.error('lore post failed:', e.message);
      }
      if (made >= 2) break;
    }
  } finally {
    running = false;
  }
  return made;
}

export function startScheduler(everyMs = 30_000) {
  const timer = setInterval(() => tick().catch((e) => console.error('lore tick failed:', e)), everyMs);
  timer.unref?.();
  return timer;
}

export async function listPosts({ mint, limit = 30 } = {}) {
  const all = await store.get('posts.json', {});
  const list = mint ? (all[mint] ?? []) : Object.values(all).flat();
  return list.sort((a, b) => b.ts - a.ts).slice(0, Math.min(Math.max(limit, 1), 50));
}
