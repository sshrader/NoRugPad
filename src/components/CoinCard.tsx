import type { Coin, Post } from '../lib/api';
import { voiceLabel } from '../lib/cats';
import { ago } from '../lib/time';
import { href } from '../router';
import CatAvatar from './CatAvatar';

// One coin on the Explore page. The whole card is a link to the coin's page.
export default function CoinCard({ coin, latest }: { coin: Coin; latest?: Post }) {
  const cat = coin.cat;
  return (
    <a className="card coincard" href={href.coin(coin.mint)}>
      <div className="cc-top">
        <img src={coin.imageUrl} alt="" width={56} height={56} loading="lazy" />
        <div className="cc-id">
          <h3>{coin.name}</h3>
          <span className="mono muted small">${coin.symbol} · {ago(coin.createdAt)}</span>
        </div>
      </div>
      {coin.description && <p className="desc clamp2">{coin.description}</p>}
      <div className="cc-cat">
        <CatAvatar id={cat.id} name={cat.name} size={32} />
        <p className="clamp3">
          <b>{cat.name}</b> <span className="muted">· {voiceLabel(cat.voice)}</span>
          <br />
          <span className="muted">{latest ? latest.text : `${cat.name} is writing the first entry…`}</span>
        </p>
      </div>
    </a>
  );
}
