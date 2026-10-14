import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listCoins, listPosts, type Coin, type Post } from '../lib/api';
import { H, W, createWorld, type WorldPet } from '../lib/petWorld';
import { speciesOf } from '../lib/pets';
import { href } from '../router';
import { petLook } from './PetAvatar';

const MAX_PETS = 40;
const shorten = (s: string, n = 14) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function toPet(c: Coin): WorldPet {
  return { mint: c.mint, petId: c.cat.id, look: petLook(c.cat.id), name: c.cat.name, symbol: c.symbol };
}

// A shared top-down park. Every coin's pet lives here and wanders around; the coin's own pet is marked with an arrow.
// Tap a pet for a hop and its latest diary line. Tap a name tag to open that coin.
export default function PetPark({ coin, line }: { coin?: Coin; line?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const tags = useRef(new Map<string, HTMLAnchorElement>());
  const reduce = useMemo(() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }, []);
  const [playing, setPlaying] = useState(!reduce);
  const [visible, setVisible] = useState(true);
  const [coins, setCoins] = useState<Coin[]>(coin ? [coin] : []);
  const [latest, setLatest] = useState<Record<string, string>>({});
  const [bubble, setBubble] = useState<{ mint: string; text: string } | null>(null);
  const playRef = useRef(playing && visible);
  playRef.current = playing && visible;

  const world = useMemo(() => createWorld(), []);

  // The coin on this page first, then the newest others.
  const shown = useMemo(() => {
    if (!coin) return coins.slice(0, MAX_PETS); // home page: no featured pet, just the newest coins
    const others = coins.filter((c) => c.mint !== coin.mint).slice(0, MAX_PETS - 1);
    return [coin, ...others];
  }, [coins, coin]);

  useEffect(() => {
    world.setPets(shown.map(toPet), coin?.mint);
  }, [world, shown, coin?.mint]);

  // Fetch everyone else now and then, so new launches turn up in the park.
  useEffect(() => {
    let alive = true;
    const load = () => {
      listCoins()
        .then((c) => alive && setCoins(c))
        .catch(() => {});
      listPosts(50)
        .then((posts: Post[]) => {
          if (!alive) return;
          const m: Record<string, string> = {};
          for (const p of posts) if (!(p.mint in m)) m[p.mint] = p.text;
          setLatest(m);
        })
        .catch(() => {});
    };
    load();
    const t = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // Pause while scrolled out of view.
  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const placeTags = useCallback(() => {
    for (const p of world.positions()) {
      const el = tags.current.get(p.mint);
      if (!el) continue;
      el.style.left = `${((p.x + 8) / W) * 100}%`;
      el.style.top = `${((p.y + 18) / H) * 100}%`;
    }
  }, [world]);

  useEffect(() => {
    const el = canvas.current;
    const g = el?.getContext('2d');
    if (!el || !g) return;
    world.draw(g);
    placeTags();
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (playRef.current && !document.hidden) {
        world.update(dt);
        world.draw(g);
        placeTags();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [world, placeTags, shown]);

  useEffect(() => {
    if (!bubble) return;
    const t = setTimeout(() => setBubble(null), 6500);
    return () => clearTimeout(t);
  }, [bubble]);

  function logical(e: React.PointerEvent | React.MouseEvent) {
    const r = canvas.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }

  function poke(mint: string) {
    const c = shown.find((x) => x.mint === mint);
    if (!c) return;
    world.hop(mint);
    const text = (mint === coin?.mint ? line : latest[mint]) || (speciesOf(c.cat) === 'dog' ? `${c.cat.name} wags its tail.` : `${c.cat.name} gives a slow blink.`);
    setBubble({ mint, text });
    if (!playRef.current) {
      const g = canvas.current?.getContext('2d');
      if (g) world.draw(g);
    }
  }

  const bubbleCoin = bubble ? shown.find((c) => c.mint === bubble.mint) : undefined;
  const pet = coin?.cat;

  return (
    <section className="card park" aria-label="The Pawpad park" ref={box}>
      <div className="park-h">
        <div>
          <p className="eyebrow mono">The park</p>
          <h3>{pet && shown.length === 1 ? `${pet.name} has the park to itself` : `${shown.length} ${shown.length === 1 ? 'pet' : 'pets'} out and about`}</h3>
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
          aria-label={`A top-down pixel park where ${shown.length} AI pets wander.${pet ? ` ${pet.name}, this coin's pet, is marked with an arrow.` : ''}`}
          onPointerMove={(e) => {
            const p = logical(e);
            const m = world.hitTest(p.x, p.y);
            world.hold(m);
            e.currentTarget.style.cursor = m ? 'pointer' : 'default';
          }}
          onPointerLeave={() => world.hold(null)}
          onClick={(e) => {
            const p = logical(e);
            const m = world.hitTest(p.x, p.y);
            if (m) poke(m);
          }}
        />
        <div className="park-tags" aria-label="Pets in the park">
          {shown.map((c) => (
            <a
              key={c.mint}
              ref={(el) => {
                if (el) tags.current.set(c.mint, el);
                else tags.current.delete(c.mint);
              }}
              className={`park-tag${c.mint === coin?.mint ? ' me' : ''}`}
              href={href.coin(c.mint)}
              title={`${c.name} ($${c.symbol}) with ${c.cat.name} the ${c.cat.breed.toLowerCase()}`}
              onPointerEnter={() => world.hold(c.mint)}
              onPointerLeave={() => world.hold(null)}
              onFocus={() => world.hold(c.mint)}
              onBlur={() => world.hold(null)}
            >
              {shorten(c.name, 12)}
              <span className="sp">/{speciesOf(c.cat)}</span>
            </a>
          ))}
        </div>
        {bubble && (
          <div className="park-bubble" role="status">
            <b>{shown.find((c) => c.mint === bubble.mint)?.cat.name}</b>
            {bubbleCoin && bubbleCoin.mint !== coin?.mint && <span className="muted"> · {bubbleCoin.name}</span>}: {bubble.text}
            {bubbleCoin && bubbleCoin.mint !== coin?.mint && (
              <>
                {' '}
                <a href={href.coin(bubbleCoin.mint)}>Open coin</a>
              </>
            )}
          </div>
        )}
      </div>
      <p className="muted small park-foot">
        Tap a pet for a hop and its latest diary line. Name tags show each pet's coin and open its page.{pet ? ` The arrow marks ${pet.name}.` : ''}
        {reduce ? ' Motion is paused because your device asks for less movement. Press Play to start it.' : ''}
      </p>
    </section>
  );
}
