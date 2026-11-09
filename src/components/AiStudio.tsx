import { useEffect, useRef, useState } from 'react';
import { aiConcept, aiMascot, aiStatus, type Concept } from '../lib/api';

type Props = {
  creator: string | null;
  /** The coin's current image, so the studio can show which drawing is the one on the coin. */
  image: File | null;
  onConcept: (c: Concept) => void;
  onMascot: (f: File) => void;
};

type Pic = { id: number; mime: string; b64: string };
const MAX_PICS = 6;
const src = (p: Pic) => `data:${p.mime};base64,${p.b64}`;

async function toFile(p: Pic): Promise<File> {
  const blob = await (await fetch(src(p))).blob();
  const ext = p.mime === 'image/png' ? 'png' : p.mime === 'image/webp' ? 'webp' : 'jpg';
  return new File([blob], `mascot.${ext}`, { type: p.mime });
}

// "Describe your coin": the AI writes the name, ticker and description, then draws an original mascot.
// Each new drawing goes onto the coin as its image straight away. Picking an earlier drawing puts that one on instead,
// and the creator can edit the mascot description and redraw, or drop in their own picture below. Everything can be changed in the form.
export default function AiStudio({ creator, image, onConcept, onMascot }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [idea, setIdea] = useState('');
  const [concept, setConcept] = useState<Concept | null>(null);
  const [mascotText, setMascotText] = useState('');
  const [pics, setPics] = useState<Pic[]>([]);
  const [shown, setShown] = useState<number | null>(null); // id of the picture on display
  const mascotBox = useRef<HTMLTextAreaElement>(null);
  const files = useRef(new Map<number, File>()); // the File handed to the coin for each drawing
  const [busy, setBusy] = useState<'' | 'idea' | 'mascot'>('');
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    aiStatus()
      .then((s) => alive && setEnabled(s.enabled))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Let the mascot description grow to fit its text, so it can be read without scrolling.
  useEffect(() => {
    const el = mascotBox.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [mascotText, concept]);

  if (!enabled) return null;

  const msg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Try again.');
  const current = pics.find((p) => p.id === shown) ?? null;
  const working = busy !== '';

  async function putOnCoin(pic: Pic) {
    let f = files.current.get(pic.id);
    if (!f) {
      f = await toFile(pic);
      files.current.set(pic.id, f);
    }
    onMascot(f);
  }

  async function draw(text: string) {
    if (!creator) throw new Error('Connect your wallet first.');
    setBusy('mascot');
    try {
      const r = await aiMascot(text, creator);
      const pic: Pic = { id: Date.now() + Math.random(), mime: r.mime, b64: r.image };
      setPics((all) => [...all, pic].slice(-MAX_PICS));
      setShown(pic.id);
      await putOnCoin(pic);
    } finally {
      setBusy('');
    }
  }

  async function generate() {
    setError('');
    if (!creator) return setError('Connect your wallet first.');
    setBusy('idea');
    try {
      const c = await aiConcept(idea, creator);
      setConcept(c);
      setMascotText(c.mascot);
      setPics([]);
      setShown(null);
      files.current.clear();
      onConcept(c);
      setBusy('');
      await draw(c.mascot);
    } catch (e) {
      setBusy('');
      setError(msg(e));
    }
  }

  async function redraw() {
    setError('');
    try {
      await draw(mascotText);
    } catch (e) {
      setError(msg(e));
    }
  }

  async function pick(p: Pic) {
    setError('');
    setShown(p.id);
    try {
      await putOnCoin(p);
    } catch (e) {
      setError(msg(e));
    }
  }

  return (
    <section className="studio" aria-label="Describe your coin">
      <h3>Describe your coin</h3>
      <p className="muted small">
        Tell us the idea in a sentence. We'll write the name, ticker and description and draw an original mascot. Each drawing goes on your coin as its picture straight away. Pick an earlier drawing to switch back, or upload your own below. You can edit everything.
      </p>
      <div className="field">
        <label htmlFor="idea" className="sr">Your idea</label>
        <textarea
          id="idea"
          rows={2}
          maxLength={300}
          value={idea}
          placeholder="A sleepy raccoon who runs the night shift at a pizza factory"
          onChange={(e) => setIdea(e.target.value)}
        />
      </div>
      <div className="studio-btns">
        <button type="button" className="btn primary" onClick={generate} disabled={working || idea.trim().length < 3 || !creator}>
          {busy === 'idea' ? 'Writing the coin…' : concept ? 'Start over with this idea' : 'Make my coin'}
        </button>
      </div>
      {!creator && <p className="muted small">Connect your wallet to use the generator.</p>}
      {error && <p className="error" role="alert">{error}</p>}

      {concept && (
        <div className="studio-result">
          <div className="studio-pic" aria-live="polite">
            {current ? (
              <img src={src(current)} alt="Your coin's AI-drawn mascot" />
            ) : (
              <span className="muted">{busy === 'mascot' ? 'Drawing the mascot…' : 'No drawing yet'}</span>
            )}
            {busy === 'mascot' && current && <span className="studio-busy">Drawing…</span>}
          </div>

          <div className="studio-side">
            <div className="field">
              <label htmlFor="mascot-text">Mascot description</label>
              <textarea id="mascot-text" ref={mascotBox} rows={6} maxLength={300} value={mascotText} onChange={(e) => setMascotText(e.target.value)} />
              <span className="muted small">Change this and press "Draw again" to get a different mascot.</span>
            </div>
            <div className="studio-btns">
              <button type="button" className="btn primary" onClick={redraw} disabled={working || mascotText.trim().length < 3}>
                {busy === 'mascot' ? 'Drawing…' : 'Draw again'}
              </button>
            </div>
            {pics.length > 0 && (
              <div className="studio-thumbs" role="group" aria-label="Your drawings. The ticked one is on your coin.">
                {pics.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    className={p.id === shown ? 'on' : ''}
                    aria-pressed={p.id === shown}
                    aria-label={`Drawing ${i + 1}${files.current.get(p.id) === image ? ', on your coin' : ''}`}
                    onClick={() => pick(p)}
                    disabled={working}
                  >
                    <img src={src(p)} alt="" />
                    {files.current.get(p.id) === image && <span className="studio-tick" aria-hidden="true">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {concept && <p className="muted small">The mascot is AI-generated. You're responsible for what you launch, so check it before you do.</p>}
    </section>
  );
}
