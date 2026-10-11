import { useEffect, useRef, useState } from 'react';
import { getMarket, type Market } from '../lib/api';

const W = 720;
const H = 220;
const PAD = { l: 8, r: 8, t: 12, b: 8 };

export function usd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export default function MarketChart({ mint }: { mint: string }) {
  const [m, setM] = useState<Market | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      getMarket(mint)
        .then((x) => alive && setM(x))
        .catch(() => {});
    setM(null);
    load();
    const t = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [mint]);

  if (!m) return <section className="card mkt"><p className="muted small">Loading market data…</p></section>;

  if (m.source === 'none' || m.source === 'error' || !m.history.length) {
    return (
      <section className="card mkt">
        <h3>Market cap</h3>
        <p className="muted">
          {m.source === 'error'
            ? `Could not reach DexScreener (${m.message}). Trying again shortly.`
            : 'DexScreener has no trading pair for this address yet. The chart appears once the coin trades on a DEX.'}
        </p>
      </section>
    );
  }

  const pts = m.history;
  const vals = pts.map((p) => p.mc);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;
  const t0 = pts[0].t;
  const t1 = pts[pts.length - 1].t;
  const x = (t: number) => PAD.l + ((t - t0) / (t1 - t0 || 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / span) * (H - PAD.t - PAD.b);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.mc).toFixed(1)}`).join('');
  const area = `${line}L${x(t1).toFixed(1)},${H}L${x(t0).toFixed(1)},${H}Z`;

  const first = pts[0].mc;
  const cur = m.mc ?? pts[pts.length - 1].mc;
  const change = m.change24h ?? ((cur - first) / first) * 100;
  const up = change >= 0;
  const shown = hover !== null ? pts[hover] : null;

  function move(e: React.PointerEvent) {
    const r = svg.current?.getBoundingClientRect();
    if (!r) return;
    const t = t0 + ((e.clientX - r.left) / r.width) * (t1 - t0);
    let best = 0;
    for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i].t - t) < Math.abs(pts[best].t - t)) best = i;
    setHover(best);
  }

  return (
    <section className="card mkt" aria-label="Market cap chart">
      <div className="mkt-h">
        <div>
          <p className="eyebrow mono">Market cap</p>
          <p className="mkt-v mono">{usd(shown ? shown.mc : cur)}</p>
          <p className="muted small mono">
            {shown ? new Date(shown.t).toLocaleString() : `last 24h`}
          </p>
        </div>
        <div className={`mkt-chg mono ${up ? 'up' : 'down'}`}>
          {up ? '▲ +' : '▼ '}
          {change.toFixed(1)}%
        </div>
      </div>

      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        className="mkt-svg"
        role="img"
        aria-label={`Market cap ${usd(cur)}, ${up ? 'up' : 'down'} ${Math.abs(change).toFixed(1)} percent over 24 hours`}
        onPointerMove={move}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="mktfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.28" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className={up ? 'up' : 'down'}>
          <path d={area} fill="url(#mktfill)" />
          <path d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </g>
        {shown && (
          <g>
            <line x1={x(shown.t)} x2={x(shown.t)} y1={PAD.t} y2={H} className="mkt-cross" vectorEffect="non-scaling-stroke" />
            <circle cx={x(shown.t)} cy={y(shown.mc)} r="4" className="mkt-dot" />
          </g>
        )}
      </svg>

      <p className="muted small mkt-foot">
        {m.source === 'curve' ? (
          <>Price from the bonding curve{m.mcSol != null && <> · {m.mcSol.toFixed(1)} SOL market cap</>}. History is recorded since this server first saw the coin.</>
        ) : m.source === 'demo' ? (
          <>Demo data: these numbers are made up and move randomly, for testing. Set <span className="mono">MARKET_MODE=live</span> to use DexScreener.</>
        ) : (
          <>
            Live from DexScreener{m.pairUrl && <> · <a href={m.pairUrl} target="_blank" rel="noreferrer">view pair</a></>}. History is recorded since this server first saw the coin.
          </>
        )}
      </p>
    </section>
  );
}
