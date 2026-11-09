import { useEffect, useState } from 'react';
import { aiConcept, aiMascot, aiStatus, type Concept } from '../lib/api';

type Props = {
  creator: string | null;
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
// Drawings are only candidates. The creator looks at them, can edit the mascot description and redraw, and the picture
// is only put on the coin when they press "Use this mascot". Everything can still be changed in the form below.
export default function AiStudio({ creator, onConcept, onMascot }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [idea, setIdea] = useState('');
  const [concept, setConcept] = useState<Concept | null>(null);
  const [mascotText, setMascotText] = useState('');
  const [pics, setPics] = useState<Pic[]>([]);
  const [shown, setShown] = useState<number | null>(null); // id of the picture on display
  const [used, setUsed] = useState<number | null>(null); // id of the picture attached to the coin
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

  if (!enabled) return null;

  const msg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Try again.');
  const current = pics.find((p) => p.id === shown) ?? null;
  const working = busy !== '';

  async function draw(text: string) {
    if (!creator) throw new Error('Connect your wallet first.');
    setBusy('mascot');
    try {
      const r = await aiMascot(text, creator);
      const pic: Pic = { id: Date.now() + Math.random(), mime: r.mime, b64: r.image };
      setPics((all) => [...all, pic].slice(-MAX_PICS));
      setShown(pic.id);
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
      setUsed(null);
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

  async function useIt() {
    if (!current) return;
    setError('');
    try {
      onMascot(await toFile(current));
      setUsed(current.id);
    } catch (e) {
      setError(msg(e));
    }
  }

  return (
    <section className="studio" aria-label="Describe your coin">
      <h3>Describe your coin</h3>
      <p className="muted small">
        Tell us the idea in a sentence. We'll write the name, ticker and description and draw an original mascot. Nothing goes on your coin until you press "Use this mascot", and you can edit everything below.
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
              <textarea id="mascot-text" rows={3} maxLength={300} value={mascotText} onChange={(e) => setMascotText(e.target.value)} />
              <span className="muted small">Change this and press "Draw again" to get a different mascot.</span>
            </div>
            <div className="studio-btns">
              <button type="button" className="btn primary" onClick={useIt} disabled={!current || working || used === current?.id}>
                {used !== null && used === current?.id ? 'Using this mascot ✓' : 'Use this mascot'}
              </button>
              <button type="button" className="btn" onClick={redraw} disabled={working || mascotText.trim().length < 3}>
                {busy === 'mascot' ? 'Drawing…' : 'Draw again'}
              </button>
            </div>
            {pics.length > 1 && (
              <div className="studio-thumbs" role="group" aria-label="Earlier drawings">
                {pics.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    className={p.id === shown ? 'on' : ''}
                    aria-pressed={p.id === shown}
                    aria-label={`Drawing ${i + 1}${p.id === used ? ', in use' : ''}`}
                    onClick={() => setShown(p.id)}
                    disabled={working}
                  >
                    <img src={src(p)} alt="" />
                    {p.id === used && <span className="studio-tick" aria-hidden="true">✓</span>}
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
