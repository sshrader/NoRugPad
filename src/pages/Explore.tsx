import { useEffect, useMemo, useState } from 'react';
import { getAllMarkets, listCoins, listPosts, type Coin, type Market, type Post } from '../lib/api';
import { CURVE_ON } from '../config';
import { href } from '../router';
import CoinCard from '../components/CoinCard';
import PetPark from '../components/PetPark';

export default function Explore() {
  const [coins, setCoins] = useState<Coin[] | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'new' | 'mc'>('new');
  const [markets, setMarkets] = useState<Record<string, Omit<Market, 'history'>>>({});

  useEffect(() => {
    let alive = true;
    listCoins()
      .then((c) => alive && (setCoins(c), setError('')))
      .catch(() => alive && setError('Could not reach the API. Is the server running? (npm run dev starts both.)'));
    const load = () =>
      listPosts(50)
        .then((p) => alive && setPosts(p))
        .catch(() => {});
    load();
    const loadMarkets = () =>
      getAllMarkets()
        .then((m) => alive && setMarkets(m))
        .catch(() => {});
    loadMarkets();
    const timer = setInterval(load, 20000);
    const mtimer = setInterval(loadMarkets, 10000);
    return () => {
      alive = false;
      clearInterval(timer);
      clearInterval(mtimer);
    };
  }, []);

  // Posts arrive newest first, so the first one seen for a coin is its latest.
  const latest = useMemo(() => {
    const m = new Map<string, Post>();
    for (const p of posts) if (!m.has(p.mint)) m.set(p.mint, p);
    return m;
  }, [posts]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!coins) return [];
    const list = term ? coins.filter((c) => [c.name, c.symbol, c.cat.name].some((s) => s.toLowerCase().includes(term))) : coins;
    return sort === 'mc' ? [...list].sort((a, b) => (markets[b.mint]?.mc ?? 0) - (markets[a.mint]?.mc ?? 0)) : list;
  }, [coins, q, sort, markets]);

  return (
    <div className="wrap">
      <section className="hero">
        <div>
          <p className="eyebrow mono">Solana memecoin launchpad · AI pets</p>
          <h1>Launch a coin. Adopt a pet.</h1>
          <p className="lede">
            Every coin on Pawpad is paired with a random AI cat or dog that writes its lore, chats with its holders, and roams a shared pixel park with
            every other coin's pet. Meet yours the moment you launch.
          </p>
          <div className="badges">
            <span className="badge">🐾 One-click launch</span>
            {CURVE_ON && <span className="badge">📈 Trades on a bonding curve from the first second</span>}
            {CURVE_ON && <span className="badge">🔒 Liquidity locked after graduation</span>}
            <span className="badge">🤖 Pets are AI, always labelled</span>
          </div>
          <div className="cta">
            <a className="btn primary" href={href.launch}>Launch a coin</a>
            <a className="btn" href={href.wire}>Read the Paw Wire</a>
          </div>
        </div>
      </section>

      {coins && coins.length > 0 && <PetPark />}

      <section className="filters">
        <h2>Launched coins{coins ? <span className="muted"> · {coins.length}</span> : null}</h2>
        <label className="search">
          <span className="sr">Search coins</span>
          <input className="in" type="text" placeholder="Search name, ticker or pet" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
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
          <h3>No coins yet</h3>
          <p className="muted">Launch the first one and meet its cat.</p>
          <a className="btn primary" href={href.launch}>Launch a coin</a>
        </div>
      )}
      {coins && coins.length > 0 && shown.length === 0 && <p className="muted empty">No coins match "{q}".</p>}
      <div className="grid">
        {shown.map((c) => (
          <CoinCard key={c.mint} coin={c} latest={latest.get(c.mint)} market={markets[c.mint]} />
        ))}
      </div>
    </div>
  );
}
