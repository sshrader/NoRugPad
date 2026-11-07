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
