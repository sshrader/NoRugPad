import { useEffect, useMemo, useRef, useState } from 'react';
import type { Coin } from '../lib/api';
import { BH, BW, SCALE, createBattle, type BattleStats } from '../lib/rugWorld';

// Pawprint Arena: the coin's own logo fights off cartoon rug pullers, scammers and bots to protect the liquidity vault.
// It is only a show. It does not read or change anything on chain. Tap the scene (or the button) when the meter is full for the special move.
export default function RugBattle({ coin }: { coin: Coin }) {
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
  const [stats, setStats] = useState<BattleStats | null>(null);
  const playRef = useRef(playing && visible);
  playRef.current = playing && visible;

  const battle = useMemo(() => createBattle(), []);

  // Use the coin's logo as the hero. If it fails to load the engine draws a gold coin with the ticker letter.
  useEffect(() => {
    battle.setSkin({ name: coin.name, symbol: coin.symbol });
    if (!coin.imageUrl) return;
    let alive = true;
    const img = new Image();
    img.onload = () => alive && battle.setSkin({ name: coin.name, symbol: coin.symbol, image: img });
    img.src = coin.imageUrl;
    return () => {
      alive = false;
    };
  }, [battle, coin.name, coin.symbol, coin.imageUrl]);

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
      const next = battle.stats();
      const key = JSON.stringify(next);
      if (key !== lastKey) {
        lastKey = key;
        setStats(next);
      }
    };
    battle.draw(g);
    publish();
    let raf = 0;
    let last = performance.now();
    let statT = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (playRef.current && !document.hidden) {
        battle.update(dt);
        battle.draw(g);
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
  }, [battle]);

  function special() {
    if (!battle.unleash()) return;
    if (!playRef.current) {
      const g = canvas.current?.getContext('2d');
      if (g) battle.draw(g);
    }
    setStats(battle.stats());
  }

  const s = stats;
  return (
    <section className="card rug" aria-label="Pawprint Arena" ref={box}>
      <div className="park-h">
        <div>
          <p className="eyebrow">Pawprint Arena</p>
          <h3>{coin.name} guards the liquidity</h3>
        </div>
        <div className="rug-btns">
          <button type="button" className="btn" onClick={special} disabled={!s || s.meter < 100}>
            Diamond hands
          </button>
          <button type="button" className="btn" onClick={() => setPlaying((p) => !p)} aria-pressed={!playing}>
            {playing ? 'Pause' : 'Play'}
          </button>
        </div>
      </div>

      <div className="park-stage">
        <canvas
          ref={canvas}
          width={BW * SCALE}
          height={BH * SCALE}
          className="rug-canvas"
          role="img"
          aria-label={`A pixel battle scene. The logo of ${coin.name} fights cartoon rug pullers, scammers and bots to protect a liquidity vault.`}
          onClick={special}
        />
        {s && (
          <div className="hud" aria-hidden="true">
            <span className="hud-wave">Wave {s.wave}</span>
            {s.combo >= 3 && <span className="hud-combo">x{s.combo} combo</span>}
            {s.banner && (
              <span className="hud-banner" style={{ color: s.banner.color }}>
                {s.banner.text}
              </span>
            )}
            <div className={`hud-meter${s.meter >= 100 ? ' full' : ''}`}>
              <span>{s.meter >= 100 ? 'Tap for diamond hands' : 'Diamond hands'}</span>
              <i>
                <b style={{ width: `${s.meter}%` }} />
              </i>
            </div>
          </div>
        )}
      </div>

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
      <p className="muted small park-foot">
        A made-up cartoon fight. It does not read or move anything on chain. Tap the scene when the meter is full for the special move.
        {reduce ? ' Motion is paused because your device asks for less movement. Press Play to start it.' : ''}
      </p>
    </section>
  );
}
