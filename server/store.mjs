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

// Clears the saved coins, market history and uploaded images once per RESET_DATA value (set it to any new text, then restart).
// The old files are moved into a "reset-backup-<value>" folder next to them, not deleted.
// On mainnet it also needs RESET_DATA_MAINNET=wipe-mainnet-list, so a stray variable can never clear a live site.
// Coins already launched stay on chain and keep trading; this only empties this site's list.
export function resetIfRequested() {
  const result = queue.then(doReset);
  queue = result.catch(() => {});
  return result;
}

async function doReset() {
  const token = process.env.RESET_DATA;
  if (!token) return false;
  if ((process.env.SOLANA_CLUSTER || 'devnet') === 'mainnet-beta' && process.env.RESET_DATA_MAINNET !== 'wipe-mainnet-list') {
    console.warn('RESET_DATA ignored on mainnet: also set RESET_DATA_MAINNET=wipe-mainnet-list to confirm.');
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
  const safe = token.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 40);
  const backup = path.join(d, `reset-backup-${safe}`);
  await fs.mkdir(backup, { recursive: true });
  for (const f of ['coins.json', 'market.json', 'uploads.json', 'samples.json', 'uploads']) {
    try {
      await fs.rename(path.join(d, f), path.join(backup, f));
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
  }
  await fs.writeFile(marker, token);
  console.log(`RESET_DATA=${token}: moved saved coins, market history and uploads to ${backup}.`);
  return true;
}
