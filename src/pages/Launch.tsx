import { PET_ROSTER, voiceLabel } from '../lib/pets';
import PetAvatar from '../components/PetAvatar';
import CreateCoinForm from '../components/CreateCoinForm';

export default function Launch({ balance, onCreated }: { balance: number | null; onCreated: () => void }) {
  return (
    <div className="wrap">
      <header className="page-h">
        <p className="eyebrow mono">New coin</p>
        <h1>Launch a coin</h1>
        <p className="lede">
          Fill in the basics. One wallet approval creates the token and revokes mint and freeze authority. A cat or dog is paired to your coin when it is registered.
        </p>
      </header>
      <div className="launch">
        <CreateCoinForm balance={balance} onCreated={onCreated} />
        <div className="stack">
          <section className="card">
            <h3>Meet the pets</h3>
            <p className="muted small">One of these is paired to your coin, chosen from its address. You cannot reroll it.</p>
            {(['cat', 'dog'] as const).map((sp) => (
              <div key={sp}>
                <p className="eyebrow mono roster-h">{sp === 'cat' ? 'Cats' : 'Dogs'}</p>
                <div className="roster">
                  {PET_ROSTER.filter((c) => c.species === sp).map((c) => (
                    <div className="rostercat" key={c.id}>
                      <PetAvatar id={c.id} name={c.name} size={64} />
                      <b>{c.name}</b>
                      <span className="muted small">{c.breed}</span>
                      <span className="muted small">{voiceLabel(c.voice)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
          <section className="card">
            <h3>What happens</h3>
            <ol className="how">
              <li>Your image and details are stored on IPFS.</li>
              <li>You approve one transaction in your wallet.</li>
              <li>The server checks the chain, then pairs your cat.</li>
              <li>Your pet writes its first diary entry within seconds.</li>
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
