import { useEffect, useMemo, useRef, useState } from 'react';
import type { Coin } from '../lib/api';
import { FH, FW, MAX_DEFENDERS, SCALE, createField, type FieldStats } from '../lib/rugField';
import { href } from '../router';

// NoRugPad Field: every recent coin's logo defends a shared liquidity vault from cartoon rug pullers, scammers and bots.
// It is only a show, run separately in each visitor's browser. A logo's strength has nothing to do with whether a coin is safe.
export default function RugField({ coins }: { coins: Coin[] }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const reduce = useMemo(() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }, []);
  const [playing, setPlaying] = useState(!reduce);
  const [visible, setVisible] = useState(true);
  const [stats, setStats] = useState<FieldStats | null>(null);
  const [hover, setHover] = useState<{ mint: string; name: string; symbol: string; x: number; y: number } | null>(null);
  const playRef = useRef(playing && visible);
  playRef.current = playing && visible;

  const field = useMemo(() => createField(), []);
  const images = useRef(new Map<string, HTMLImageElement>());
  const shown = useMemo(() => coins.slice(0, MAX_DEFENDERS), [coins]);

  // Hand the engine the newest coins, with their logos once each one has loaded.
  // `push` is kept in a ref so an image that finishes loading always reaches the latest list, even if the effect re-ran meanwhile
  // (React's dev mode runs effects twice, which used to leave the logos unapplied).
  const pushRef = useRef<() => void>(() => {});
  useEffect(() => {
    const push = () =>
      field.setDefenders(
        shown.map((c) => {
          const im = images.current.get(c.mint);
          return { mint: c.mint, name: c.name, symbol: c.symbol, image: im && im.complete && im.naturalWidth > 0 ? im : null };
        }),
      );
    pushRef.current = push;
    push();
    for (const c of shown) {
      if (!c.imageUrl || images.current.has(c.mint)) continue;
      const im = new Image();
      images.current.set(c.mint, im);
      im.onload = () => pushRef.current();
      im.src = c.imageUrl;
    }
  }, [field, shown]);

  // Pause while scrolled out of view.
  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = canvas.current;
    const g = el?.getContext('2d');
    if (!el || !g) return;
    let lastKey = '';
    const publish = () => {
      const next = field.stats();
      const key = JSON.stringify(next);
      if (key !== lastKey) {
        lastKey = key;
        setStats(next);
      }
    };
    field.draw(g);
    publish();
    let raf = 0;
    let last = performance.now();
    let statT = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (playRef.current && !document.hidden) {
        field.update(dt);
        field.draw(g);
        statT += dt;
        if (statT > 0.2) {
          statT = 0;
          publish();
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [field]);

  function logical(e: React.PointerEvent | React.MouseEvent) {
    const r = canvas.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * FW, y: ((e.clientY - r.top) / r.height) * FH };
  }

  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const p = logical(e);
    const mint = field.hitTest(p.x, p.y);
    e.currentTarget.style.cursor = mint ? 'pointer' : 'default';
    if (!mint) return setHover(null);
    const d = field.positions().find((x) => x.mint === mint);
    setHover(d ? { mint, name: d.name, symbol: d.symbol, x: d.x, y: d.y } : null);
  }

  const s = stats;
  return (
    <section className="card rug field" aria-label="NoRugPad Field" ref={box}>
      <div className="park-h">
        <div>
          <p className="eyebrow">NoRugPad Field</p>
          <h3>{shown.length === 1 ? '1 coin is' : `${shown.length} coins are`} guarding the vault</h3>
        </div>
        <button type="button" className="btn" onClick={() => setPlaying((p) => !p)} aria-pressed={!playing}>
          {playing ? 'Pause' : 'Play'}
        </button>
      </div>

      <div className="park-stage">
        <canvas
          ref={canvas}
          width={FW * SCALE}
          height={FH * SCALE}
          className="rug-canvas"
          role="img"
          aria-label={`A top-down pixel battle scene. The logos of ${shown.length} coins fight cartoon rug pullers, scammers and bots to protect a liquidity vault.`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          onClick={(e) => {
            const p = logical(e);
            const mint = field.hitTest(p.x, p.y);
            if (mint) window.location.hash = href.coin(mint);
          }}
        />
        {s && (
          <div className="hud" aria-hidden="true">
            <span className="hud-wave">Wave {s.wave}</span>
            {s.banner && (
              <span className="hud-banner" style={{ color: s.banner.color }}>
                {s.banner.text}
              </span>
            )}
            <div className={`hud-meter${s.meter >= 100 ? ' full' : ''}`}>
              <span>{s.meter >= 100 ? 'Diamond hands ready' : 'Diamond hands'}</span>
              <i>
                <b style={{ width: `${s.meter}%` }} />
              </i>
            </div>
          </div>
        )}
        {hover && (
          <a
            className="park-tag me"
            href={href.coin(hover.mint)}
            style={{ left: `${(hover.x / FW) * 100}%`, top: `${((hover.y + 13) / FH) * 100}%`, pointerEvents: 'auto' }}
            tabIndex={-1}
          >
            {hover.name} <span className="sp">${hover.symbol}</span>
          </a>
        )}
      </div>

      <div className="field-bottom">
        <p className="rug-stats mono small">
          {s ? (
            <>
              <span>Wave {s.wave}</span>
              <span>Rugs stopped {s.rugs}</span>
              <span>Scams blocked {s.scams}</span>
              <span>Vault {s.vault}%</span>
            </>
          ) : null}
        </p>
        {s && s.top.length > 0 && (
          <div className="field-top">
            <span className="eyebrow">Top defenders</span>
            <ol>
              {s.top.map((t) => (
                <li key={t.mint}>
                  <a href={href.coin(t.mint)}>{t.name}</a> <span className="muted mono small">{t.kills}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
      <p className="muted small park-foot">
        A made-up cartoon fight that runs in your browser, so every visitor sees their own. Tap a logo to open its coin. The scene says nothing about whether any coin is safe.
        {reduce ? ' Motion is paused because your device asks for less movement. Press Play to start it.' : ''}
      </p>
    </section>
  );
}
