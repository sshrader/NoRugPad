import { useCallback, useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { IS_MAINNET, explorerTx } from '../config';
import { curveStatus, quoteSwap, swap } from '../lib/dbc';
import type { Coin } from '../lib/api';

const fmt = (n: number) => (n >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : n.toPrecision(4));

function friendly(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/reject|denied|cancel/i.test(msg)) return 'You declined the transaction in your wallet.';
  if (/insufficient|0x1\b/i.test(msg)) return 'Not enough balance for this trade plus fees.';
  if (/slippage|ExceededSlippage/i.test(msg)) return 'The price moved too much. Try again.';
  return msg;
}

export default function TradeBox({ coin }: { coin: Coin }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [est, setEst] = useState<{ out: number; min: number } | null>(null);
  const [status, setStatus] = useState<{ migrated: boolean; progress: number } | null>(null);
  const [held, setHeld] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const refresh = useCallback(async () => {
    curveStatus(connection, coin.pool!).then(setStatus).catch(() => {});
    if (!wallet.publicKey) return setHeld(null);
    try {
      const r = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, { mint: new PublicKey(coin.mint) });
      setHeld(r.value.reduce((n, a) => n + (a.account.data.parsed.info.tokenAmount.uiAmount ?? 0), 0));
    } catch {
      setHeld(null);
    }
  }, [connection, coin.mint, wallet.publicKey]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [refresh]);

  const n = Number(amount);
  useEffect(() => {
    setEst(null);
    if (!(n > 0)) return;
    let alive = true;
    const t = setTimeout(() => {
      quoteSwap(connection, coin.pool!, side, n)
        .then((q) => alive && (setEst(q), setError('')))
        .catch((e) => alive && setError(friendly(e)));
    }, 700);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [n, side, connection, coin.mint]);

  async function go() {
    setError('');
    setDone('');
    if (!(n > 0)) return setError('Enter an amount.');
    setBusy(true);
    try {
      const sig = await swap(connection, wallet, coin.pool!, side, n);
      setDone(sig);
      setAmount('');
      refresh();
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  if (status?.migrated) {
    return (
      <section className="card trade">
        <h3>Trade</h3>
        <p className="muted">This coin filled its curve and moved to a regular DEX pool. Trade it on Jupiter or any Solana DEX.</p>
      </section>
    );
  }

  return (
    <section className="card trade" aria-label="Trade">
      <h3>Trade</h3>
      <div className="seg" role="tablist" aria-label="Buy or sell">
        {(['buy', 'sell'] as const).map((s) => (
          <button key={s} role="tab" aria-selected={side === s} className={side === s ? 'on' : ''} onClick={() => (setSide(s), setAmount(''), setDone(''))}>
            {s === 'buy' ? 'Buy' : 'Sell'}
          </button>
        ))}
      </div>

      <div className="field">
        <label htmlFor="amt">{side === 'buy' ? 'You pay (SOL)' : `You sell (${coin.symbol})`}</label>
        <input id="amt" className="mono" inputMode="decimal" value={amount} placeholder="0.0" onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} autoComplete="off" />
        {side === 'sell' && held !== null && (
          <button type="button" className="linkbtn small" onClick={() => setAmount(String(held))}>
            Max: {fmt(held)}
          </button>
        )}
      </div>

      {est && (
        <p className="muted small mono">
          You get about {fmt(est.out)} {side === 'buy' ? coin.symbol : 'SOL'} (at least {fmt(est.min)} with 1% slippage)
        </p>
      )}

      {status && (
        <div className="progress" aria-label={`Curve ${Math.round(status.progress * 100)} percent full`}>
          <div style={{ width: `${Math.min(100, status.progress * 100)}%` }} />
          <span className="small muted">{Math.round(status.progress * 100)}% to DEX</span>
        </div>
      )}

      {error && <p className="error" role="alert">{error}</p>}
      {done && (
        <p className="success small" role="status">
          Done. <a href={explorerTx(done)} target="_blank" rel="noreferrer">View transaction</a>
        </p>
      )}

      <button className="btn primary wide" disabled={busy || !wallet.publicKey || !(n > 0)} onClick={go}>
        {!wallet.publicKey ? 'Connect a wallet to trade' : busy ? 'Waiting…' : side === 'buy' ? `Buy ${coin.symbol}` : `Sell ${coin.symbol}`}
      </button>
      <p className="muted small">Trading fees apply and prices move with every trade. {IS_MAINNET ? 'You can lose everything you put in.' : 'Test coins on devnet have no value.'}</p>
    </section>
  );
}
