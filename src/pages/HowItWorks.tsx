import { href } from '../router';

// Plain-language explanation of how Orbit Pad works, what it checks, and what it cannot stop.
// Only state things the app does today. Plans stay in the "Planned" section and are not promises.
export default function HowItWorks() {
  return (
    <div className="wrap prose">
      <p className="back"><a href={href.explore}>← All coins</a></p>
      <h1>How Orbit Pad works</h1>
      <p className="lede">
        A rug pull is when the people behind a coin take the money out and leave holders with tokens worth nothing. This page explains how coins here are set up to make the common ways of doing that harder, what we check, and what no one can stop.
      </p>

      <h2>How a coin is launched and traded</h2>
      <ol>
        <li>The creator describes an idea in a sentence or two. AI writes the name, ticker and description and draws an original mascot. The creator can edit the text, redraw the mascot as many times as they like, or upload their own picture, then picks the one to use.</li>
        <li>The creator launches the coin. It's a plain token with a fixed supply of 1 billion. Orbit Pad has no way to change a coin's name or image after launch.</li>
        <li>Trading happens on a Meteora bonding curve. The price moves up as people buy and down as they sell, and the curve is the other side of every trade.</li>
        <li>
          When the curve fills up, the coin graduates to a Meteora DEX pool.{' '}
          {/* VERIFY before publishing: confirm in Meteora's docs how much of the graduated liquidity is locked and for how long. */}
          The liquidity moves to a Meteora DAMM v2 pool, where it is locked under Meteora's rules.
        </li>
        <li>Every trade on the curve pays a 1% fee, shared between Orbit Pad and Meteora. The creator earns no fees. We never hold your funds.</li>
      </ol>

      <h2>Common rugs, and what is done about them</h2>
      <dl className="faq">
        <div>
          <dt>The creator creates more tokens and sells them</dt>
          <dd>Each coin page shows whether mint authority is still active, read live from the chain. Launches where the creator still controls minting are rejected.</dd>
        </div>
        <div>
          <dt>The creator freezes holders' tokens</dt>
          <dd>Each coin page shows whether freeze authority is still active.</dd>
        </div>
        <div>
          <dt>The creator pulls the liquidity</dt>
          <dd>
            {/* VERIFY before publishing: confirm against Meteora's docs that creators have no way to withdraw curve liquidity. */}
            While a coin is on the curve, its liquidity sits in Meteora's program, which doesn't give creators a way to withdraw it. After graduation it is locked under Meteora's rules.
          </dd>
        </div>
        <div>
          <dt>The creator secretly holds a large share</dt>
          <dd>Each coin page shows the share held by the largest wallet, the top 10 wallets and the creator, and any tokens the creator bought in the same transaction that created the pool.</dd>
        </div>
        <div>
          <dt>The coin has a bad reputation elsewhere</dt>
          <dd>On mainnet, each coin page shows RugCheck's score and listed risks, with a link to their full report.</dd>
        </div>
      </dl>

      <h2>What no one can stop</h2>
      <ul>
        <li>Large holders selling, and groups of wallets that secretly belong to one person.</li>
        <li>Hype that fades, and prices that fall to zero.</li>
        <li>Fake or copycat coins, and scam links shared elsewhere.</li>
        <li>AI-written text and drawings that are odd, wrong or too close to something that already exists. The creator is responsible for what they launch.</li>
      </ul>
      <p>
        The checks show facts at one moment. They do not mean a coin is safe. Coins are not endorsed by Orbit Pad, the service is unaudited beta software, and nothing here is financial advice. Only risk what you can afford to lose.
      </p>

      <h2>Planned</h2>
      <p className="muted">These are plans, not promises, and some may change.</p>
      <ul>
        <li>Detecting groups of linked wallets and bundled buys.</li>
        <li>Anti-sniper fee settings on future curves.</li>
        <li>Protections against bots in the first moments of a launch.</li>
        <li>Image moderation, a report button and takedowns.</li>
        <li>Blocking copycat names for well-known brands and "official" coins.</li>
      </ul>

      <p className="cta">
        <a className="btn primary" href={href.explore}>See the coins</a>
      </p>
    </div>
  );
}
