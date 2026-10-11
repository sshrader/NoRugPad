import { useEffect, useState } from 'react';
import { listPosts, type Post } from '../lib/api';
import { ago } from '../lib/time';
import CatAvatar from './CatAvatar';

// The latest diary entries from every coin's cat.
export default function CatWire({ refreshKey }: { refreshKey: number }) {
  const [posts, setPosts] = useState<Post[] | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      listPosts(8)
        .then((p) => alive && setPosts(p))
        .catch(() => {});
    load();
    // New coins write their first entry a moment after launch, so check again soon.
    const first = setTimeout(load, 6000);
    const timer = setInterval(load, 20000);
    return () => {
      alive = false;
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [refreshKey]);

  return (
    <section className="wire card" aria-label="Cat Wire">
      <div className="wire-h">
        <h3>Cat Wire</h3>
        <span className="muted small">Lore written by the cats. Every entry is AI.</span>
      </div>
      {posts && posts.length === 0 && <p className="muted small">No entries yet. A new coin's cat writes its first one within seconds.</p>}
      {posts?.map((p) => (
        <article className="entry withcat" key={p.id}>
          <CatAvatar id={p.catId} name={p.catName} size={36} />
          <div className="entrybody">
          <div className="entry-h">
            <b>{p.catName}</b>
            <span className="mono muted">${p.symbol}</span>
            <span className="tag">AI{p.source === 'template' ? ' · canned' : ''}</span>
            <span className="muted small">{ago(p.ts)}</span>
          </div>
          <p>{p.text}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
