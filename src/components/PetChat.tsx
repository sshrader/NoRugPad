import { useEffect, useRef, useState, type FormEvent } from 'react';
import { sendChat, type ChatTurn, type Coin } from '../lib/api';
import { voiceLabel } from '../lib/pets';
import PetAvatar from './PetAvatar';

const SUGGESTIONS = ['Who are you?', 'Tell me the lore', 'Is this safe?', 'Will it moon?'];

// Text a coin's pet.
export default function PetChat({ coin }: { coin: Coin }) {
  const cat = coin.cat;
  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [canned, setCanned] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [chat, busy]);

  async function submit(raw: string) {
    const message = raw.trim();
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
      setError(err instanceof Error ? err.message : 'Could not reach your pet.');
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submit(text);
  }

  return (
    <section className="card chatcard" aria-label={`Chat with ${cat.name}`}>
      <div className="chat-head">
        <PetAvatar id={cat.id} name={cat.name} size={48} />
        <div>
          <h3>Text {cat.name}</h3>
          <p className="muted small">
            {cat.breed} · {voiceLabel(cat.voice)} voice · an AI pet, not a financial advisor
          </p>
        </div>
      </div>

      <div className="chatlog" ref={logRef} role="log" aria-live="polite">
        {chat.length === 0 && <p className="muted small">Say hi to {cat.name}, or tap one of the suggestions.</p>}
        {chat.map((t, i) => (
          <div key={i} className={`bubble ${t.role}`}>
            {t.text}
          </div>
        ))}
        {busy && <div className="bubble cat typing">{cat.name} is typing…</div>}
      </div>

      {canned && <p className="muted small">The AI is resting, so that was a canned reply.</p>}
      {error && <p className="error small">{error}</p>}

      <div className="suggest">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" className="chip" disabled={busy} onClick={() => submit(s)}>
            {s}
          </button>
        ))}
      </div>

      <form className="chatform" onSubmit={onSubmit}>
        <label className="sr" htmlFor="chat-input">Message {cat.name}</label>
        <input id="chat-input" value={text} maxLength={240} placeholder={`Send ${cat.name} a text`} onChange={(e) => setText(e.target.value)} autoComplete="off" />
        <button className="btn primary" type="submit" disabled={busy || !text.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}
