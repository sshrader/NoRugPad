export type Cat = { id: string; name: string; breed: string; voice: string };

export type Coin = {
  mint: string;
  creator: string;
  signature: string;
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  metadataUri: string;
  cat: Cat;
  createdAt: number;
};

export type UploadResult = { uploadId: string; metadataUri: string; imageUrl: string; storage: 'pinata' | 'local' };

async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
  return body as T;
}

export async function uploadMetadata(fields: { name: string; symbol: string; description: string; image: File }): Promise<UploadResult> {
  const form = new FormData();
  form.append('name', fields.name);
  form.append('symbol', fields.symbol);
  form.append('description', fields.description);
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
