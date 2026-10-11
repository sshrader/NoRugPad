import { CAT_ROSTER, voiceLabel } from '../lib/cats';
import CatAvatar from '../components/CatAvatar';
import CreateCoinForm from '../components/CreateCoinForm';

export default function Launch({ balance, onCreated }: { balance: number | null; onCreated: () => void }) {
  return (
    <div className="wrap">
      <header className="page-h">
        <p className="eyebrow mono">New coin</p>
        <h1>Launch a coin</h1>
        <p className="lede">
          Fill in the basics. One wallet approval creates the token and revokes mint and freeze authority. A cat is paired to your coin when it is registered.
        </p>
      </header>
      <div className="launch">
        <CreateCoinForm balance={balance} onCreated={onCreated} />
        <div className="stack">
          <section className="card">
            <h3>Meet the cats</h3>
            <p className="muted small">One of these is paired to your coin, chosen from its address. You cannot reroll it.</p>
            <div className="roster">
              {CAT_ROSTER.map((c) => (
                <div className="rostercat" key={c.id}>
                  <CatAvatar id={c.id} name={c.name} size={64} />
                  <b>{c.name}</b>
                  <span className="muted small">{voiceLabel(c.voice)}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="card">
            <h3>What happens</h3>
            <ol className="how">
              <li>Your image and details are stored on IPFS.</li>
              <li>You approve one transaction in your wallet.</li>
              <li>The server checks the chain, then pairs your cat.</li>
              <li>Your cat writes its first diary entry within seconds.</li>
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
