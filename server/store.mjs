// A tiny JSON-file store. Good enough for a prototype. Swap for Postgres/SQLite later.
import fs from 'node:fs/promises';
import path from 'node:path';

// DATA_DIR lets tests use a temporary folder.
const dir = () => path.resolve(process.env.DATA_DIR || 'server/data');

let queue = Promise.resolve();

async function read(name, fallback) {
  try {
    return JSON.parse(await fs.readFile(path.join(dir(), name), 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return fallback;
    throw e;
  }
}

// Updates run one at a time so two requests cannot overwrite each other.
export function update(name, fallback, fn) {
  const run = async () => {
    await fs.mkdir(dir(), { recursive: true });
    const data = await read(name, fallback);
    const next = await fn(data);
    await fs.writeFile(path.join(dir(), name), name === 'market.json' ? JSON.stringify(next) : JSON.stringify(next, null, 2));
    return next;
  };
  const result = queue.then(run);
  queue = result.catch(() => {});
  return result;
}

export const get = (name, fallback) => read(name, fallback);

// Devnet only: wipe the saved coins, market history and uploaded images once per RESET_DATA value.
// Set RESET_DATA to any new text (for example "1", then "2") and restart. It never runs on mainnet.
export async function resetIfRequested() {
  const token = process.env.RESET_DATA;
  if (!token) return false;
  if ((process.env.SOLANA_CLUSTER || 'devnet') === 'mainnet-beta') {
    console.warn('RESET_DATA ignored: it never runs on mainnet.');
    return false;
  }
  const d = dir();
  const marker = path.join(d, '.reset-marker');
  await fs.mkdir(d, { recursive: true });
  let done = '';
  try {
    done = (await fs.readFile(marker, 'utf8')).trim();
  } catch {}
  if (done === token) return false;
  for (const f of ['coins.json', 'market.json', 'uploads.json', 'samples.json']) await fs.rm(path.join(d, f), { force: true });
  await fs.rm(path.join(d, 'uploads'), { recursive: true, force: true });
  await fs.writeFile(marker, token);
  console.log(`RESET_DATA=${token}: cleared saved coins, market history and uploads.`);
  return true;
}
