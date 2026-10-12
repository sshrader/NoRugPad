import { useEffect, useMemo, useRef, useState } from 'react';
import type { Coin } from '../lib/api';
import { H, SCENE_NAMES, W, createScene } from '../lib/petScene';
import { speciesOf } from '../lib/pets';
import { petLook } from './PetAvatar';

// A little pixel world where the coin's pet wanders around. Click the pet to make it hop and "say" its latest diary line.
export default function PetPark({ coin, line }: { coin: Coin; line?: string }) {
  const pet = coin.cat;
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
  const [bubble, setBubble] = useState('');
  const playRef = useRef(playing && visible);
  playRef.current = playing && visible;

  const scene = useMemo(() => createScene({ mint: coin.mint, look: petLook(pet.id) }), [coin.mint, pet.id]);
  const species = speciesOf(pet);

  // Pause while scrolled out of view, so it costs nothing.
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
    g.imageSmoothingEnabled = false;
    scene.draw(g); // always show at least one frame
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (playRef.current && !document.hidden) {
        scene.update(dt);
        scene.draw(g);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [scene]);

  useEffect(() => {
    if (!bubble) return;
    const t = setTimeout(() => setBubble(''), 6000);
    return () => clearTimeout(t);
  }, [bubble]);

  function poke() {
    scene.hop();
    setBubble(line || (species === 'dog' ? `${pet.name} wags its tail.` : `${pet.name} gives a slow blink.`));
    if (!playRef.current) {
      // still redraw once so the hop is visible when paused
      const g = canvas.current?.getContext('2d');
      if (g) scene.draw(g);
    }
  }

  return (
    <section className="card park" aria-label={`${pet.name} exploring ${SCENE_NAMES[scene.kind]}`} ref={box}>
      <div className="park-h">
        <div>
          <p className="eyebrow mono">Out and about</p>
          <h3>{pet.name} is exploring {SCENE_NAMES[scene.kind]}</h3>
        </div>
        <button type="button" className="btn" onClick={() => setPlaying((p) => !p)} aria-pressed={!playing}>
          {playing ? 'Pause' : 'Play'}
        </button>
      </div>
      <div className="park-stage">
        <canvas
          ref={canvas}
          width={W}
          height={H}
          className="park-canvas"
          role="img"
          aria-label={`A pixel scene of ${pet.name} the ${pet.breed.toLowerCase()} walking through ${SCENE_NAMES[scene.kind]}`}
          onClick={poke}
        />
        {bubble && (
          <div className="park-bubble" role="status">
            <b>{pet.name}:</b> {bubble}
          </div>
        )}
      </div>
      <p className="muted small park-foot">Tap {pet.name} for a hop. {reduce ? 'Motion is paused because your device asks for less movement. Press Play to start it.' : ''}</p>
    </section>
  );
}
