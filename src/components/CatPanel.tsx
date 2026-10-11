import { useEffect, useRef, useState } from 'react';
import { listCoinPosts, sendChat, type ChatTurn, type Coin, type Post } from '../lib/api';
import { ago } from '../lib/time';

// Text a coin's cat, and read its diary.
export default function CatPanel({ coin }: { coin: Coin }) {
  const cat = coin.cat;
  const [posts, setPosts] = useState<Post[]>([]);
  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [canned, setCanned] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      listCoinPosts(coin.mint)
        .then((p) => alive && setPosts(p))
        .catch(() => {});
    load();
    const first = setTimeout(load, 6000);
    const timer = setInterval(load, 20000);
    return () => {
      alive = false;
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [coin.mint]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [chat, busy]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const message = text.trim();
    if (!message || busy) return;
    setError('');
    setText('');
    const history = chat;
    setChat([...history, { role: 'me', text: message }]);
    setBusy(true);
    try {
      const out = await sendChat(coin.mint, message, history);
      setCanned(out.source === 'template');
      setChat((c) => [...c, { role: 'cat', text: out.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the cat.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="catpanel">
      <div className="chatcol">
        <h5>Text {cat.name}</h5>
        <div className="chatlog" ref={logRef} role="log" aria-live="polite">
          {chat.length === 0 && <p className="muted small">Say hi to {cat.name}. {cat.name} is an AI cat and cannot give financial advice.</p>}
          {chat.map((t, i) => (
            <div key={i} className={`bubble ${t.role}`}>
              {t.text}
            </div>
          ))}
          {busy && <div className="bubble cat typing">{cat.name} is typing…</div>}
        </div>
        {canned && <p className="muted small">The AI is resting, so this was a canned reply.</p>}
        {error && <p className="error small">{error}</p>}
        <form className="chatform" onSubmit={send}>
          <label className="sr" htmlFor={`chat-${coin.mint}`}>Message {cat.name}</label>
          <input id={`chat-${coin.mint}`} value={text} maxLength={240} placeholder={`Send ${cat.name} a text`} onChange={(e) => setText(e.target.value)} autoComplete="off" />
          <button className="btn primary" type="submit" disabled={busy || !text.trim()}>
            Send
          </button>
        </form>
      </div>

      <div className="logcol">
        <h5>{cat.name}'s log</h5>
        {posts.length === 0 && <p className="muted small">{cat.name} is writing the first entry…</p>}
        {posts.map((p) => (
          <article className="entry" key={p.id}>
            <div className="entry-h">
              <span className="mono muted small">Chapter {p.chapter}</span>
              <span className="tag">AI{p.source === 'template' ? ' · canned' : ''}</span>
              <span className="muted small">{ago(p.ts)}</span>
            </div>
            <p>{p.text}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
