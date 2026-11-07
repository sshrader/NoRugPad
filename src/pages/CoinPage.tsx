import { useEffect, useState } from 'react';
import { explorerAddress } from '../config';
import { getCoin, type Coin } from '../lib/api';
import { ago } from '../lib/time';
import { href } from '../router';
import CopyAddress from '../components/CopyAddress';
import MarketChart from '../components/MarketChart';
import SafetyPanel from '../components/SafetyPanel';
import RugBattle from '../components/RugBattle';
import TradeBox from '../components/TradeBox';

const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

export default function CoinPage({ mint }: { mint: string }) {
  const [coin, setCoin] = useState<Coin | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    setCoin(null);
    setMissing(false);
    getCoin(mint)
      .then((c) => alive && setCoin(c))
      .catch(() => alive && setMissing(true));
    return () => {
      alive = false;
    };
  }, [mint]);

  if (missing) {
    return (
      <div className="wrap">
        <p className="back"><a href={href.explore}>← All coins</a></p>
        <div className="card emptycard">
          <h3>Coin not found</h3>
          <p className="muted">This address is not registered here. It may belong to another network or have been removed.</p>
        </div>
      </div>
    );
  }
  if (!coin) {
    return (
      <div className="wrap">
        <p className="muted empty">Loading…</p>
      </div>
    );
  }

  return (
    <div className="wrap">
      <p className="back"><a href={href.explore}>← All coins</a></p>

      <section className="card coinhead">
        <img src={coin.imageUrl} alt="" width={88} height={88} />
        <div className="ch-main">
          <h1>{coin.name} <span className="mono muted">${coin.symbol}</span></h1>
          <p className="mono muted small">
            by {short(coin.creator)} · launched {ago(coin.createdAt)}
          </p>
          <CopyAddress address={coin.mint} />
          <p className="small ca-links">
            <a href={explorerAddress(coin.mint)} target="_blank" rel="noreferrer">View on Solana Explorer</a>
          </p>
          {coin.description && <p className="ch-desc">{coin.description}</p>}
          {(coin.twitter || coin.website || coin.telegram) && (
            <p className="small ca-links">
              {coin.twitter && <a href={coin.twitter} target="_blank" rel="noreferrer noopener nofollow">X / Twitter</a>}
              {coin.website && <a href={coin.website} target="_blank" rel="noreferrer noopener nofollow">Website</a>}
              {coin.telegram && <a href={coin.telegram} target="_blank" rel="noreferrer noopener nofollow">Telegram</a>}
            </p>
          )}
        </div>
      </section>

      {coin.devBuy && (
        <p className="card devnote" role="note">
          <b>Block-zero dev buy:</b> the creator bought {coin.devBuy.tokens.toLocaleString('en-US', { maximumFractionDigits: 0 })} tokens ({coin.devBuy.pct}% of supply) in the same transaction that created the pool.
        </p>
      )}

      <SafetyPanel coin={coin} />

      <MarketChart mint={coin.mint} />

      <RugBattle coin={coin} />

      {coin.curve ? (
        <TradeBox coin={coin} />
      ) : (
        <section className="card soon">
          <h3>Trading</h3>
          <p className="muted">This coin was launched without a bonding curve, so there is nothing to trade on this page.</p>
        </section>
      )}
    </div>
  );
}
