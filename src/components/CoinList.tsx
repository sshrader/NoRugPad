import { useEffect, useState } from 'react';
import { explorerAddress } from '../config';
import { listCoins, type Coin } from '../lib/api';
import CatPanel from './CatPanel';
import CatAvatar from './CatAvatar';

const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

export default function CoinList({ refreshKey }: { refreshKey: number }) {
  const [coins, setCoins] = useState<Coin[] | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);

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
            <div className="coin-row">
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
                  <CatAvatar id={c.cat.id} name={c.cat.name} size={32} />
                  <span>
                    <b>{c.cat.name}</b> · {c.cat.breed} · {c.cat.voice}
                  </span>
                </p>
                <button className="btn" type="button" aria-expanded={open === c.mint} onClick={() => setOpen(open === c.mint ? null : c.mint)}>
                  {open === c.mint ? 'Close' : `Meet ${c.cat.name}`}
                </button>
              </div>
            </div>
            {open === c.mint && <CatPanel coin={c} />}
          </article>
        ))}
      </div>
    </section>
  );
}
