export type Coin = {
  mint: string;
  creator: string;
  signature: string;
  name: string;
  symbol: string;
  description: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  imageUrl: string;
  metadataUri: string;
  createdAt: number;
  curve?: boolean;
  pool?: string;
  /** Verified from the launch transaction: what the creator bought in the very same block as the pool. */
  devBuy?: { tokens: number; pct: number };
};

export type UploadResult = { uploadId: string; metadataUri: string; imageUrl: string; storage: 'pinata' | 'local' };

async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
  return body as T;
}

export async function uploadMetadata(fields: { name: string; symbol: string; description: string; website?: string; twitter?: string; telegram?: string; image: File; creator: string }): Promise<UploadResult> {
  const form = new FormData();
  form.append('name', fields.name);
  form.append('symbol', fields.symbol);
  form.append('description', fields.description);
  form.append('creator', fields.creator);
  for (const k of ['website', 'twitter', 'telegram'] as const) if (fields[k]) form.append(k, fields[k] as string);
  form.append('image', fields.image);
  return json<UploadResult>(await fetch('/api/upload', { method: 'POST', body: form }));
}

export async function registerCoin(body: { mint: string; signature: string; creator: string; uploadId: string }): Promise<Coin> {
  return json<Coin>(
    await fetch('/api/coins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  );
}

export async function listCoins(): Promise<Coin[]> {
  return json<Coin[]>(await fetch('/api/coins'));
}

export async function getCoin(mint: string): Promise<Coin> {
  return json<Coin>(await fetch(`/api/coins/${encodeURIComponent(mint)}`));
}

export type Market = {
  source: 'demo' | 'curve' | 'dexscreener' | 'none' | 'error';
  mcSol?: number;
  progress?: number;
  migrated?: boolean;
  mc?: number;
  priceUsd?: number | null;
  change24h?: number | null;
  pairUrl?: string;
  message?: string;
  history: { t: number; mc: number }[];
};

export async function getMarket(mint: string): Promise<Market> {
  return json<Market>(await fetch(`/api/coins/${encodeURIComponent(mint)}/market`));
}

export async function getAllMarkets(): Promise<Record<string, Omit<Market, 'history'>>> {
  return json(await fetch('/api/market'));
}

export type SafetyCheck = {
  checkedAt: number;
  mintRevoked: boolean;
  freezeRevoked: boolean;
  supply: number;
  holders: null | {
    top10Pct: number;
    top1Pct: number;
    creatorPct: number;
    curvePct: number;
    programPct: number;
    holders: { account: string; owner: string | null; pct: number; kind: 'curve' | 'program' | 'wallet'; creator: boolean }[];
  };
  rugcheck: null | { score: number | null; lpLockedPct: number | null; url: string; risks: { name: string; level: string; description: string }[] };
  rugcheckNote: string | null;
};

export async function getCheck(mint: string): Promise<SafetyCheck> {
  return json<SafetyCheck>(await fetch(`/api/coins/${encodeURIComponent(mint)}/check`));
}

export type Concept = { name: string; symbol: string; description: string; mascot: string };

export async function aiStatus(): Promise<{ enabled: boolean }> {
  return json(await fetch('/api/ai/status'));
}

async function post<T>(path: string, body: unknown): Promise<T> {
  return json<T>(await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
}

/** Turns an idea into a coin name, ticker, description and a mascot description. */
export const aiConcept = (text: string, creator: string) => post<Concept>('/api/ai/concept', { text, creator });

/** Draws the mascot. Returns a base64 image. */
export const aiMascot = (text: string, creator: string) => post<{ mime: string; image: string }>('/api/ai/mascot', { text, creator });
