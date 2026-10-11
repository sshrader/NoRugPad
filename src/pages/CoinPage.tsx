import { useEffect, useState } from 'react';
import { explorerAddress } from '../config';
import { getCoin, listCoinPosts, type Coin, type Post } from '../lib/api';
import { voiceLabel } from '../lib/cats';
import { ago } from '../lib/time';
import { href } from '../router';
import CatAvatar from '../components/CatAvatar';
import CatChat from '../components/CatChat';
import PostList from '../components/PostList';

const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

export default function CoinPage({ mint }: { mint: string }) {
  const [coin, setCoin] = useState<Coin | null>(null);
  const [missing, setMissing] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    let alive = true;
    setCoin(null);
    setMissing(false);
    getCoin(mint)
      .then((c) => alive && setCoin(c))
      .catch(() => alive && setMissing(true));
    const load = () =>
      listCoinPosts(mint)
        .then((p) => alive && setPosts(p))
        .catch(() => {});
    load();
    // A new coin's first entry appears a few seconds after launch, so check again soon.
    const first = setTimeout(load, 6000);
    const timer = setInterval(load, 20000);
    return () => {
      alive = false;
      clearTimeout(first);
      clearInterval(timer);
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

  const cat = coin.cat;
  const ck = <span className="okmark" aria-hidden="true">✓</span>;
  return (
    <div className="wrap">
      <p className="back"><a href={href.explore}>← All coins</a></p>

      <section className="card coinhead">
        <img src={coin.imageUrl} alt="" width={88} height={88} />
        <div className="ch-main">
          <h1>{coin.name} <span className="mono muted">${coin.symbol}</span></h1>
          <p className="mono muted small">
            <a href={explorerAddress(coin.mint)} target="_blank" rel="noreferrer">{short(coin.mint)}</a>
            {' · '}by {short(coin.creator)} · launched {ago(coin.createdAt)}
          </p>
          {coin.description && <p className="ch-desc">{coin.description}</p>}
          <div className="badges">
            <span className="badge">{ck} Mint revoked</span>
            <span className="badge">{ck} Freeze revoked</span>
            <span className="badge">{ck} Cat posts labelled AI</span>
          </div>
        </div>
      </section>

      <section className="card catcard">
        <CatAvatar id={cat.id} name={cat.name} size={88} />
        <div>
          <p className="eyebrow mono">This coin's cat</p>
          <h2>{cat.name}</h2>
          <p className="muted">{cat.breed} · {voiceLabel(cat.voice)} voice</p>
        </div>
      </section>

      <div className="cp-grid">
        <CatChat coin={coin} />
        <section className="card logcard" aria-label={`${cat.name}'s log`}>
          <div className="log-h">
            <h3>{cat.name}'s log</h3>
            <span className="muted small">Written by an AI cat</span>
          </div>
          {posts.length === 0 ? <p className="muted small">{cat.name} is writing the first entry…</p> : <PostList posts={posts} mode="log" />}
        </section>
      </div>

      <section className="card soon">
        <h3>Trading</h3>
        <p className="muted">
          Buying and selling opens once the bonding curve is built. Right now the creator holds the full supply, so there is nothing to trade on this page yet.
        </p>
      </section>
    </div>
  );
}
