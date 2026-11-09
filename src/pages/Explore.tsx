import { useEffect, useMemo, useState } from 'react';
import { getAllMarkets, listCoins, type Coin, type Market } from '../lib/api';
import { CURVE_ON } from '../config';
import { href } from '../router';
import CoinCard from '../components/CoinCard';
import FactoryScene from '../components/FactoryScene';

export default function Explore() {
  const [coins, setCoins] = useState<Coin[] | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'new' | 'mc'>('new');
  const [markets, setMarkets] = useState<Record<string, Omit<Market, 'history'>>>({});

  useEffect(() => {
    let alive = true;
    listCoins()
      .then((c) => alive && (setCoins(c), setError('')))
      .catch(() => alive && setError('Could not reach the API. Is the server running? (npm run dev starts both.)'));
    const loadMarkets = () =>
      getAllMarkets()
        .then((m) => alive && setMarkets(m))
        .catch(() => {});
    loadMarkets();
    const mtimer = setInterval(loadMarkets, 10000);
    return () => {
      alive = false;
      clearInterval(mtimer);
    };
  }, []);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!coins) return [];
    const list = term ? coins.filter((c) => [c.name, c.symbol].some((s) => s.toLowerCase().includes(term))) : coins;
    return sort === 'mc' ? [...list].sort((a, b) => (markets[b.mint]?.mc ?? 0) - (markets[a.mint]?.mc ?? 0)) : list;
  }, [coins, q, sort, markets]);

  return (
    <div className="wrap">
      <section className="hero solo">
        <div className="hero-copy">
          <span className="sticker">Beta. Not financial advice.</span>
          <h1>Describe a coin.<br />Meet its mascot.</h1>
          <p className="lede">
            Tell Meme Factory your idea and it writes the coin and draws an original mascot. Launch it on a Meteora bonding curve, then watch it roll off the factory belt.
          </p>
          <ul className="guards">
            <li>Mint and freeze authority are checked live on every coin</li>
            {CURVE_ON && <li>Trades on the curve from the first buy</li>}
            <li>Top holders and any creator buy are shown up front</li>
          </ul>
          <div className="cta">
            <a className="btn primary" href={href.launch}>Launch a coin</a>
            <a className="btn" href={href.how}>How it works</a>
          </div>
        </div>
      </section>

      {coins && coins.length > 0 && <FactoryScene coins={coins} />}

      <section className="filters">
        <h2>Launched coins{coins ? <span className="muted"> · {coins.length}</span> : null}</h2>
        <label className="search">
          <span className="sr">Search coins</span>
          <input className="in" type="text" placeholder="Search name or ticker" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
        </label>
        <label className="search">
          <span className="sr">Sort coins</span>
          <select className="in" value={sort} onChange={(e) => setSort(e.target.value as 'new' | 'mc')}>
            <option value="new">Newest</option>
            <option value="mc">Highest market cap</option>
          </select>
        </label>
      </section>

      {error && <p className="error">{error}</p>}
      {coins && coins.length === 0 && (
        <div className="card emptycard">
          <h3>The factory floor is empty</h3>
          <p className="muted">Launch the first coin.</p>
          <a className="btn primary" href={href.launch}>Launch a coin</a>
        </div>
      )}
      {coins && coins.length > 0 && shown.length === 0 && <p className="muted empty">No coins match "{q}".</p>}
      {shown.length > 0 && (
        <div className="board">
          <div className="board-h" aria-hidden="true">
            <span />
            <span>Coin</span>
            <span>About</span>
            <span style={{ textAlign: 'right' }}>Market cap</span>
            <span>Curve</span>
          </div>
          {shown.map((c) => (
            <CoinCard key={c.mint} coin={c} market={markets[c.mint]} />
          ))}
        </div>
      )}
    </div>
  );
}
