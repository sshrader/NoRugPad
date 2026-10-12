import type { Post } from '../lib/api';
import { ago } from '../lib/time';
import { href } from '../router';
import PetAvatar from './PetAvatar';

// A list of diary entries. 'wire' shows who wrote each one and links to the coin.
// 'log' is for one cat's own page, so it shows chapter numbers instead.
export default function PostList({ posts, mode }: { posts: Post[]; mode: 'wire' | 'log' }) {
  return (
    <div className="posts">
      {posts.map((p) => (
        <article className={`entry${mode === 'wire' ? ' withcat' : ''}`} key={p.id}>
          {mode === 'wire' && <PetAvatar id={p.catId} name={p.catName} size={40} />}
          <div className="entrybody">
            <div className="entry-h">
              {mode === 'wire' ? (
                <>
                  <b>{p.catName}</b>
                  <a className="clink mono" href={href.coin(p.mint)}>${p.symbol}</a>
                </>
              ) : (
                <span className="mono muted">Chapter {p.chapter}</span>
              )}
              <span className="tag">AI{p.source === 'template' ? ' · canned' : ''}</span>
              <span className="muted small">{ago(p.ts)}</span>
            </div>
            <p>{p.text}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
