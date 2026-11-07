import type { Coin, Market } from '../lib/api';
import { usd } from './MarketChart';
import { ago } from '../lib/time';
import { href } from '../router';

// One coin on the Explore board. The whole row is a link to the coin's page.
export default function CoinCard({ coin, market }: { coin: Coin; market?: Omit<Market, 'history'> }) {
  const pct = market?.progress != null ? Math.round(Math.min(1, Math.max(0, market.progress)) * 100) : null;
  return (
    <a className="row" href={href.coin(coin.mint)}>
      <img className="row-img" src={coin.imageUrl} alt="" width={44} height={44} loading="lazy" />
      <div className="row-id">
        <h3>{coin.name}</h3>
        <span className="mono muted small">
          ${coin.symbol} · {ago(coin.createdAt)}
          {coin.devBuy ? ` · creator bought ${coin.devBuy.pct}%` : ''}
        </span>
      </div>
      <p className="row-desc clamp2">{coin.description}</p>
      <div className="row-mc">
        {market?.mc ? (
          <>
            <b className="mono">{usd(market.mc)}</b>
            {market.change24h != null && (
              <span className={`mono small ${market.change24h >= 0 ? 'up' : 'down'}`}>
                {market.change24h >= 0 ? '▲ +' : '▼ '}{market.change24h.toFixed(1)}%
              </span>
            )}
          </>
        ) : (
          <span className="muted small">no data</span>
        )}
      </div>
      <div className="row-curve">
        {market?.migrated ? (
          <>
            <div className="meter done" aria-hidden="true"><i style={{ width: '100%' }} /></div>
            <span className="small muted">Graduated to a DEX</span>
          </>
        ) : pct != null ? (
          <>
            <div className="meter" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
            <span className="small muted">{pct}% to graduation</span>
          </>
        ) : (
          <span className="small muted">No curve</span>
        )}
      </div>
    </a>
  );
}
