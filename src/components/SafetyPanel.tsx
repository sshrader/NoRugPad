import { useEffect, useState } from 'react';
import { getCheck, type Coin, type SafetyCheck } from '../lib/api';
import { ago } from '../lib/time';

const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;
type Tone = 'ok' | 'warn' | 'bad';
const mark = { ok: '✓', warn: '!', bad: '✕' } as const;

function Row({ tone, label, value, note }: { tone: Tone; label: string; value: string; note?: string }) {
  return (
    <li className={`sc-row ${tone}`}>
      <span className="sc-mark" aria-hidden="true">{mark[tone]}</span>
      <span className="sc-label">{label}</span>
      <span className="sc-value mono">{value}</span>
      {note && <span className="sc-note muted small">{note}</span>}
    </li>
  );
}

// Facts read from the chain by our server, plus RugCheck's report on mainnet. These are signals, not a promise that a coin is safe.
export default function SafetyPanel({ coin }: { coin: Coin }) {
  const [data, setData] = useState<SafetyCheck | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setData(null);
    setError('');
    getCheck(coin.mint)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Could not run the checks.'));
    return () => {
      alive = false;
    };
  }, [coin.mint]);

  const h = data?.holders;
  const rc = data?.rugcheck;
  return (
    <section className="card safety" aria-label="Safety checks">
      <div className="park-h">
        <div>
          <p className="eyebrow">Safety checks</p>
          <h3>What the chain says about {coin.name}</h3>
        </div>
        {data && <span className="muted small">Checked {ago(data.checkedAt)}</span>}
      </div>

      {!data && !error && <p className="muted">Reading the chain…</p>}
      {error && <p className="error" role="alert">{error}</p>}

      {data && (
        <ul className="sc-list">
          <Row
            tone={data.mintRevoked ? 'ok' : 'bad'}
            label="Mint authority"
            value={data.mintRevoked ? 'Revoked' : 'Still active'}
            note={data.mintRevoked ? 'No one can create more tokens.' : 'Someone can still create more tokens.'}
          />
          <Row
            tone={data.freezeRevoked ? 'ok' : 'bad'}
            label="Freeze authority"
            value={data.freezeRevoked ? 'Revoked' : 'Still active'}
            note={data.freezeRevoked ? 'No one can freeze holders.' : 'Someone can freeze holders’ tokens.'}
          />
          {coin.devBuy && (
            <Row
              tone={coin.devBuy.pct >= 10 ? 'warn' : 'ok'}
              label="Creator’s block-zero buy"
              value={`${coin.devBuy.pct}% of supply`}
              note="Bought in the same transaction that made the pool."
            />
          )}
          {h ? (
            <>
              <Row
                tone={h.top1Pct >= 20 ? 'bad' : h.top1Pct >= 10 ? 'warn' : 'ok'}
                label="Largest wallet"
                value={`${h.top1Pct}%`}
                note="Share of total supply. The curve’s own vault is not counted."
              />
              <Row tone={h.top10Pct >= 50 ? 'bad' : h.top10Pct >= 30 ? 'warn' : 'ok'} label="Top 10 wallets" value={`${h.top10Pct}%`} />
              <Row
                tone={h.creatorPct >= 10 ? 'warn' : 'ok'}
                label="Creator holds"
                value={`${h.creatorPct}%`}
                note="Among the 20 largest token accounts."
              />
            </>
          ) : (
            <li className="sc-row warn"><span className="sc-mark" aria-hidden="true">!</span><span className="sc-label">Holders</span><span className="sc-value mono">Unavailable</span></li>
          )}
          {rc && (
            <>
              {rc.lpLockedPct !== null && (
                <Row tone={rc.lpLockedPct >= 90 ? 'ok' : rc.lpLockedPct >= 50 ? 'warn' : 'bad'} label="Liquidity locked" value={`${rc.lpLockedPct}%`} note="Reported by RugCheck." />
              )}
              {rc.risks.map((r) => (
                <Row key={r.name} tone={r.level === 'danger' ? 'bad' : r.level === 'warn' ? 'warn' : 'ok'} label={r.name} value="RugCheck" note={r.description} />
              ))}
            </>
          )}
        </ul>
      )}

      {data && h && h.holders.length > 0 && (
        <details className="sc-more">
          <summary>Largest token accounts</summary>
          <ol className="mono small">
            {h.holders.map((x) => (
              <li key={x.account}>
                {x.pct}% · {x.kind === 'curve' ? 'bonding curve vault' : x.kind === 'program' ? `program-owned ${x.owner ? short(x.owner) : ''}` : x.creator ? `creator ${x.owner ? short(x.owner) : ''}` : x.owner ? short(x.owner) : 'unknown'}
              </li>
            ))}
          </ol>
        </details>
      )}

      <p className="muted small park-foot">
        {data?.rugcheckNote && <>{data.rugcheckNote} </>}
        {rc && (
          <>
            Third-party report: <a href={rc.url} target="_blank" rel="noreferrer noopener">RugCheck</a>{rc.score !== null ? ` (score ${rc.score}, lower is safer)` : ''}.{' '}
          </>
        )}
        These checks show facts at one moment. They do not mean a coin is safe, and prices can still fall to zero.
      </p>
    </section>
  );
}
