import type { Coin, Market, Post } from '../lib/api';
import { usd } from './MarketChart';
import { voiceLabel } from '../lib/pets';
import { ago } from '../lib/time';
import { href } from '../router';
import PetAvatar from './PetAvatar';

// One coin on the Explore page. The whole card is a link to the coin's page.
export default function CoinCard({ coin, latest, market }: { coin: Coin; latest?: Post; market?: Omit<Market, 'history'> }) {
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
      <div className="cc-mc">
        <span className="muted small">Market cap</span>
        {market?.mc ? (
          <span className="mono">
            <b>{usd(market.mc)}</b>
            {market.change24h != null && (
              <span className={market.change24h >= 0 ? 'up' : 'down'}>
                {' '}{market.change24h >= 0 ? '▲ +' : '▼ '}{market.change24h.toFixed(1)}%
              </span>
            )}
          </span>
        ) : (
          <span className="muted small">no data</span>
        )}
      </div>
      {coin.description && <p className="desc clamp2">{coin.description}</p>}
      <div className="cc-cat">
        <PetAvatar id={cat.id} name={cat.name} size={32} />
        <p className="clamp3">
          <b>{cat.name}</b> <span className="muted">· {voiceLabel(cat.voice)}</span>
          <br />
          <span className="muted">{latest ? latest.text : `${cat.name} is writing the first entry…`}</span>
        </p>
      </div>
    </a>
  );
}
