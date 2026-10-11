import { useEffect, useState } from 'react';
import { explorerAddress } from '../config';
import { listCoins, type Coin } from '../lib/api';

const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

export default function CoinList({ refreshKey }: { refreshKey: number }) {
  const [coins, setCoins] = useState<Coin[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    listCoins()
      .then((c) => alive && (setCoins(c), setError('')))
      .catch(() => alive && setError('Could not reach the API. Is the server running? (npm run dev starts both.)'));
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  return (
    <section className="list" aria-label="Launched coins">
      <h3>Launched coins</h3>
      {error && <p className="error">{error}</p>}
      {coins && coins.length === 0 && <p className="muted empty">No coins yet. Launch the first one.</p>}
      <div className="coins">
        {coins?.map((c) => (
          <article className="card coin" key={c.mint}>
            <img src={c.imageUrl} alt="" width={56} height={56} loading="lazy" />
            <div className="coin-body">
              <h4>
                {c.name} <span className="mono muted">${c.symbol}</span>
              </h4>
              {c.description && <p className="desc">{c.description}</p>}
              <p className="meta mono muted">
                <a href={explorerAddress(c.mint)} target="_blank" rel="noreferrer">{short(c.mint)}</a>
                <span>by {short(c.creator)}</span>
              </p>
              <p className="cat">
                Cat: <b>{c.cat.name}</b> · {c.cat.breed} · {c.cat.voice}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
