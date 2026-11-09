import CreateCoinForm from '../components/CreateCoinForm';

export default function Launch({ balance, onCreated }: { balance: number | null; onCreated: () => void }) {
  return (
    <div className="wrap">
      <header className="page-h">
        <p className="eyebrow mono">New coin</p>
        <h1>Launch a coin</h1>
        <p className="lede">
          Describe your idea and we'll write the coin and draw its mascot, or fill in the basics yourself. One wallet approval creates the token.
        </p>
      </header>
      <div className="launch">
        <CreateCoinForm balance={balance} onCreated={onCreated} />
        <div className="stack">
          <section className="card">
            <h3>What happens</h3>
            <ol className="how">
              <li>Your mascot and details are stored for the coin page and wallets.</li>
              <li>You approve one transaction in your wallet.</li>
              <li>The server checks the chain, then lists your coin.</li>
              <li>Your coin gets its own page and battle arena.</li>
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
