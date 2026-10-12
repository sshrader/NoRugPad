import { useState } from 'react';

// Shows a full address with a copy button. Falls back to selecting the text if the clipboard is blocked.
export default function CopyAddress({ address, label = 'Contract address' }: { address: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setState('copied');
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = address;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        setState(ok ? 'copied' : 'failed');
      } catch {
        setState('failed');
      }
    }
    setTimeout(() => setState('idle'), 2000);
  }

  return (
    <div className="ca">
      <span className="ca-label muted small">{label}</span>
      <div className="ca-row">
        <code className="ca-addr mono" title={address}>{address}</code>
        <button type="button" className="btn ca-btn" onClick={copy} aria-live="polite">
          {state === 'copied' ? 'Copied ✓' : state === 'failed' ? 'Press Ctrl+C' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
