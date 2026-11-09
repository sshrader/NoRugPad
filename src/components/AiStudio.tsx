import { useEffect, useState } from 'react';
import { aiConcept, aiMascot, aiStatus, type Concept } from '../lib/api';

type Props = {
  creator: string | null;
  onConcept: (c: Concept) => void;
  onMascot: (f: File) => void;
};

async function toFile(mime: string, b64: string): Promise<File> {
  const blob = await (await fetch(`data:${mime};base64,${b64}`)).blob();
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  return new File([blob], `mascot.${ext}`, { type: mime });
}

// "Describe your coin": the AI writes the name, ticker and description, then draws an original mascot.
// Everything it makes is put into the form below, where the creator can change it before launching.
export default function AiStudio({ creator, onConcept, onMascot }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [idea, setIdea] = useState('');
  const [concept, setConcept] = useState<Concept | null>(null);
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

  async function drawMascot(text: string) {
    if (!creator) return;
    setBusy('mascot');
    try {
      const r = await aiMascot(text, creator);
      onMascot(await toFile(r.mime, r.image));
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
      onConcept(c);
      setBusy('');
      await drawMascot(c.mascot);
    } catch (e) {
      setBusy('');
      setError(msg(e));
    }
  }

  async function redraw() {
    if (!concept) return;
    setError('');
    try {
      await drawMascot(concept.mascot);
    } catch (e) {
      setError(msg(e));
    }
  }

  const working = busy !== '';
  return (
    <section className="studio" aria-label="Describe your coin">
      <h3>Describe your coin</h3>
      <p className="muted small">
        Tell us the idea in a sentence. We'll write the name, ticker and description and draw an original mascot. You can edit everything below before you launch.
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
          {busy === 'idea' ? 'Writing the coin…' : busy === 'mascot' ? 'Drawing the mascot…' : concept ? 'Start over with this idea' : 'Make my coin'}
        </button>
        {concept && (
          <button type="button" className="btn" onClick={redraw} disabled={working}>
            {busy === 'mascot' ? 'Drawing…' : 'Draw a new mascot'}
          </button>
        )}
      </div>
      {!creator && <p className="muted small">Connect your wallet to use the generator.</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {concept && <p className="muted small">Mascot idea: {concept.mascot}</p>}
      <p className="muted small">The mascot is AI-generated. You're responsible for what you launch, so check it before you do.</p>
    </section>
  );
}
