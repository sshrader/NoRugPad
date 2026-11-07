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

type Interval = '10s' | '15s' | '1m' | '5m' | '15m' | '1h';
const STEP: Record<Interval, number> = { '10s': 10_000, '15s': 15_000, '1m': 60_000, '5m': 300_000, '15m': 900_000, '1h': 3_600_000 };
const MAX_CANDLES = 60;
type Candle = { t: number; o: number; h: number; l: number; c: number };

/** Turn recorded market-cap samples into candles. Each candle opens at the previous candle's close, so there are no jumps between them.
 *  Time with no samples (nobody had the page open) is left out instead of invented. */
export function buildCandles(pts: { t: number; mc: number }[], step: number): Candle[] {
  const out: Candle[] = [];
  for (const p of pts) {
    const t = Math.floor(p.t / step) * step;
    const last = out[out.length - 1];
    if (last && last.t === t) {
      last.h = Math.max(last.h, p.mc);
      last.l = Math.min(last.l, p.mc);
      last.c = p.mc;
    } else {
      const o = last ? last.c : p.mc;
      out.push({ t, o, h: Math.max(o, p.mc), l: Math.min(o, p.mc), c: p.mc });
    }
  }
  return out;
}

export default function MarketChart({ mint }: { mint: string }) {
  const [m, setM] = useState<Market | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [interval, setInterval_] = useState<Interval>('1m');
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
  const t0 = pts[0].t;
  const t1 = pts[pts.length - 1].t;
  const candles = buildCandles(pts, STEP[interval]).slice(-MAX_CANDLES);

  // Never zoom in tighter than 10% of the value, so a tiny wobble (for example the SOL price moving a little) does not look like a crash.
  const highs = candles.map((c) => c.h);
  const lows = candles.map((c) => c.l);
  const mid = (Math.min(...lows) + Math.max(...highs)) / 2;
  const minSpan = Math.max(mid * 0.1, 1);
  const lo = Math.min(Math.min(...lows), mid - minSpan / 2);
  const hi = Math.max(Math.max(...highs), mid + minSpan / 2);
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  // Candles sit against the right edge, like a trading chart, and never get wider than 40 units each.
  const slot = Math.min((W - PAD.l - PAD.r) / candles.length, 40);
  const xAt = (i: number) => W - PAD.r - (candles.length - i) * slot + slot / 2;
  const body = Math.max(3, slot * 0.62);

  const first = pts[0].mc;
  const cur = m.mc ?? pts[pts.length - 1].mc;
  const change = m.change24h ?? ((cur - first) / first) * 100;
  const up = change >= 0;
  // A percent change over a few seconds of history says nothing, so wait for at least 10 minutes of it.
  const enoughHistory = pts.length >= 3 && t1 - t0 >= 10 * 60_000;
  const shown = hover !== null ? candles[hover] : null;

  function move(e: React.PointerEvent) {
    const r = svg.current?.getBoundingClientRect();
    if (!r) return;
    const vx = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round((vx - (W - PAD.r - candles.length * slot) - slot / 2) / slot);
    setHover(i >= 0 && i < candles.length ? i : null);
  }

  return (
    <section className="card mkt" aria-label="Market cap chart">
      <div className="mkt-h">
        <div>
          <p className="eyebrow mono">Market cap</p>
          <p className="mkt-v mono">{usd(shown ? shown.c : cur)}</p>
          <p className="muted small mono">
            {shown
              ? `${new Date(shown.t).toLocaleString()} · O ${usd(shown.o)} H ${usd(shown.h)} L ${usd(shown.l)} C ${usd(shown.c)}`
              : enoughHistory
                ? 'last 24h'
                : 'since this server first saw the coin'}
          </p>
        </div>
        <div className="mkt-side">
          {enoughHistory && (
            <div className={`mkt-chg mono ${up ? 'up' : 'down'}`}>
              {up ? '▲ +' : '▼ '}
              {change.toFixed(1)}%
            </div>
          )}
          <div className="mkt-iv" role="group" aria-label="Candle size">
            {(Object.keys(STEP) as Interval[]).map((k) => (
              <button key={k} type="button" className={k === interval ? 'on' : ''} aria-pressed={k === interval} onClick={() => { setInterval_(k); setHover(null); }}>
                {k}
              </button>
            ))}
          </div>
        </div>
      </div>

      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        className="mkt-svg"
        role="img"
        aria-label={enoughHistory ? `Candlestick chart. Market cap ${usd(cur)}, ${up ? 'up' : 'down'} ${Math.abs(change).toFixed(1)} percent over 24 hours` : `Candlestick chart. Market cap ${usd(cur)}`}
        onPointerMove={move}
        onPointerLeave={() => setHover(null)}
      >
        {candles.map((c, i) => {
          const upc = c.c >= c.o;
          const x = xAt(i);
          const yo = y(c.o);
          const yc = y(c.c);
          return (
            <g key={c.t} className={upc ? 'up' : 'down'} opacity={hover === null || hover === i ? 1 : 0.55}>
              <line x1={x} x2={x} y1={y(c.h)} y2={y(c.l)} stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
              <rect x={x - body / 2} y={Math.min(yo, yc)} width={body} height={Math.max(2, Math.abs(yo - yc))} fill="currentColor" />
            </g>
          );
        })}
        {shown && hover !== null && <line x1={xAt(hover)} x2={xAt(hover)} y1={PAD.t} y2={H} className="mkt-cross" vectorEffect="non-scaling-stroke" />}
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
