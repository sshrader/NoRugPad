import { useEffect, useRef, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { CURVE_ON, IS_MAINNET, MIN_SOL_TO_LAUNCH, MIN_SOL_TO_LAUNCH_CURVE, explorerAddress, explorerTx } from '../config';
import { createCoin } from '../lib/createCoin';
import { createCoinOnCurve } from '../lib/dbc';
import { registerCoin, uploadMetadata, type Coin, type UploadResult } from '../lib/api';
import { voiceLabel } from '../lib/pets';
import { href } from '../router';

type Phase = 'idle' | 'uploading' | 'signing' | 'confirming' | 'registering' | 'done';

const PHASE_TEXT: Record<Phase, string> = {
  idle: '',
  uploading: 'Uploading image and metadata…',
  signing: 'Approve the transaction in your wallet…',
  confirming: 'Waiting for the network to confirm…',
  registering: 'Verifying on chain and pairing your pet…',
  done: '',
};

function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/reject|denied|cancel/i.test(msg)) return 'You declined the transaction in your wallet. Nothing was created.';
  if (/insufficient|0x1\b|debit an account/i.test(msg)) return IS_MAINNET ? 'Not enough SOL in this wallet. Add some SOL, then try again.' : 'Not enough SOL in this wallet. Use Get test SOL, then try again.';
  return msg;
}

export default function CreateCoinForm({ balance, onCreated }: { balance: number | null; onCreated: (c: Coin) => void }) {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [symbolTouched, setSymbolTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [twitter, setTwitter] = useState('');
  const [telegram, setTelegram] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const [created, setCreated] = useState<Coin | null>(null);
  const doneBox = useRef<HTMLDivElement>(null);
  const [storage, setStorage] = useState<UploadResult['storage'] | null>(null);

  // Bring the success box into view once, right after a launch.
  useEffect(() => {
    if (created) doneBox.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [created]);

  useEffect(() => {
    if (!image) return setPreview(null);
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const busy = phase !== 'idle' && phase !== 'done';

  function onName(v: string) {
    setName(v);
    if (!symbolTouched) setSymbol(v.replace(/[^a-z0-9]/gi, '').slice(0, 5).toUpperCase());
  }

  function onImage(f: File | null) {
    setError('');
    if (f && f.size > 2 * 1024 * 1024) {
      setImage(null);
      return setError('Image must be under 2 MB.');
    }
    setImage(f);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setCreated(null);
    if (!wallet.publicKey) return setError('Connect your wallet first.');
    if (!name.trim()) return setError('Give your coin a name.');
    if (!/^[A-Z0-9]{2,10}$/.test(symbol)) return setError('Ticker must be 2-10 letters or numbers.');
    if (!image) return setError('Choose an image for your coin.');
    const need = CURVE_ON ? MIN_SOL_TO_LAUNCH_CURVE : MIN_SOL_TO_LAUNCH;
    if (balance !== null && balance < need) {
      return setError(`You need about ${need} SOL to launch.${IS_MAINNET ? '' : ' Use Get test SOL first.'}`);
    }

    try {
      setPhase('uploading');
      const up = await uploadMetadata({ name: name.trim(), symbol, description: description.trim(), website: website.trim(), twitter: twitter.trim(), telegram: telegram.trim(), image, creator: wallet.publicKey.toBase58() });
      setStorage(up.storage);

      const launch = CURVE_ON ? createCoinOnCurve : createCoin;
      const { mint, signature } = await launch(
        connection,
        wallet,
        { name: name.trim(), symbol, uri: up.metadataUri },
        (stage) => setPhase(stage),
      );

      setPhase('registering');
      const coin = await registerCoin({ mint, signature, creator: wallet.publicKey.toBase58(), uploadId: up.uploadId });
      setCreated(coin);
      setPhase('done');
      onCreated(coin);
      setName('');
      setSymbol('');
      setSymbolTouched(false);
      setDescription('');
      setWebsite('');
      setTwitter('');
      setTelegram('');
      setImage(null);
    } catch (err) {
      setPhase('idle');
      setError(friendlyError(err));
    }
  }

  return (
    <form className="card form" onSubmit={submit}>
      <h3>New coin</h3>

      <div className="field">
        <label htmlFor="img">Coin image</label>
        <div className="imgrow">
          <div className="imgprev">{preview ? <img src={preview} alt="Preview of your coin" /> : <span className="muted">No image</span>}</div>
          <input id="img" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => onImage(e.target.files?.[0] ?? null)} />
        </div>
      </div>

      <div className="row2">
        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" value={name} maxLength={32} placeholder="Midnight Zoomies" onChange={(e) => onName(e.target.value)} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="symbol">Ticker</label>
          <input
            id="symbol"
            className="mono"
            value={symbol}
            maxLength={10}
            placeholder="ZOOM"
            onChange={(e) => {
              setSymbolTouched(true);
              setSymbol(e.target.value.replace(/[^a-z0-9]/gi, '').toUpperCase());
            }}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="desc">Description</label>
        <textarea id="desc" value={description} maxLength={280} rows={3} placeholder="What is this coin about?" onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="row2">
        <div className="field">
          <label htmlFor="tw">X / Twitter <span className="muted">(optional)</span></label>
          <input id="tw" className="in" type="text" value={twitter} maxLength={100} placeholder="@yourcoin or x.com/yourcoin" onChange={(e) => setTwitter(e.target.value)} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="tg">Telegram <span className="muted">(optional)</span></label>
          <input id="tg" className="in" type="text" value={telegram} maxLength={100} placeholder="t.me/yourcoin" onChange={(e) => setTelegram(e.target.value)} autoComplete="off" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="web">Website <span className="muted">(optional)</span></label>
        <input id="web" className="in" type="text" value={website} maxLength={200} placeholder="https://yourcoin.xyz" onChange={(e) => setWebsite(e.target.value)} autoComplete="off" />
      </div>

      <ul className="checks">
        {CURVE_ON ? (
          <>
            <li>Trades on a bonding curve from the first second</li>
            <li>Supply: 1,000,000,000 (6 decimals), held by the curve</li>
            <li>Moves to a DEX pool when the curve fills</li>
          </>
        ) : (
          <>
            <li>Mint authority revoked</li>
            <li>Freeze authority revoked</li>
            <li>Metadata locked (immutable)</li>
            <li>Supply: 1,000,000,000 (6 decimals)</li>
          </>
        )}
      </ul>

      {busy && <p className="status" role="status">{PHASE_TEXT[phase]}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      <button className="btn primary wide" type="submit" disabled={busy || !wallet.publicKey}>
        {wallet.publicKey ? 'Launch coin' : 'Connect a wallet to launch'}
      </button>

      {created && (
        <div className="success launched" role="status" ref={doneBox}>
          <p className="launched-title">
            <b>{created.name}</b> (${created.symbol}) is live!
          </p>
          <p>
            Your pet is <b>{created.cat.name}</b>, a {created.cat.breed.toLowerCase()} with a {voiceLabel(created.cat.voice).toLowerCase()} voice.
          </p>
          <a className="btn primary big" href={href.coin(created.mint)}>
            Go to your coin page →
          </a>
          <p className="links mono">
            <a href={explorerAddress(created.mint)} target="_blank" rel="noreferrer">View token</a>
            <a href={explorerTx(created.signature)} target="_blank" rel="noreferrer">View transaction</a>
          </p>
          {storage === 'local' && (
            <p className="muted small">
              Local storage mode: the token exists, but its image link points at your own computer, so wallets and explorers
              will not show the picture. Add a Pinata key in .env to fix that.
            </p>
          )}
        </div>
      )}
    </form>
  );
}
