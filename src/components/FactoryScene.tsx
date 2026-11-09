import { useEffect, useMemo, useRef, useState } from 'react';
import type { Coin } from '../lib/api';
import { FH, FW, SCALE, createFactory } from '../lib/factory';

// Orbit Pad launch control: a cartoon console pumps coins and space crew onto a conveyor belt.
// The coins on the belt are the newest launches, with their real logos. The rest is made up, and it says nothing about any coin's safety.
export default function FactoryScene({ coins }: { coins: Coin[] }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLElement>(null);
  const reduce = useMemo(() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }, []);
  const [playing, setPlaying] = useState(!reduce);
  const [visible, setVisible] = useState(true);
  const playRef = useRef(playing && visible);
  playRef.current = playing && visible;

  const factory = useMemo(() => createFactory(), []);
  const images = useRef(new Map<string, HTMLImageElement>());
  const shown = useMemo(() => coins.slice(0, 12), [coins]);

  // Hand the scene the newest coins, with logos once each has loaded (pushRef keeps image callbacks pointing at the latest list).
  const pushRef = useRef<() => void>(() => {});
  useEffect(() => {
    const push = () =>
      factory.setCoins(
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
  }, [factory, shown]);

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
    // Show a few seconds of work straight away, so even a paused scene (reduced motion) shows a busy belt.
    for (let i = 0; i < 60 * 9; i++) factory.update(1 / 60);
    factory.draw(g);
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (playRef.current && !document.hidden) {
        factory.update(dt);
        factory.draw(g);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [factory]);

  return (
    <section className="factory" aria-label="Orbit Pad launch control" ref={box}>
      <div className="fac-stage">
        <canvas
          ref={canvas}
          width={FW * SCALE}
          height={FH * SCALE}
          className="fac-canvas"
          role="img"
          aria-label="A cartoon launch control room in space. A hopper feeds sparks of ideas into a big pink console that pumps coins and little space crew out onto a conveyor belt."
        />
        <span className="fac-sign" aria-hidden="true">Orbit Pad</span>
        <button type="button" className="btn fac-btn" onClick={() => setPlaying((p) => !p)} aria-pressed={!playing}>
          {playing ? 'Pause' : 'Play'}
        </button>
      </div>
      <p className="muted small fac-foot">
        A made-up cartoon. The coins on the belt are the newest launches, and the space crew are just for fun.
        {reduce ? ' Motion is paused because your device asks for less movement. Press Play to start it.' : ''}
      </p>
    </section>
  );
}
