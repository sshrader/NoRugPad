import { useCallback, useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { CLUSTER, IS_MAINNET } from './config';
import { href, useRoute } from './router';
import Explore from './pages/Explore';
import Launch from './pages/Launch';
import CoinPage from './pages/CoinPage';
import Admin from './pages/Admin';
import HowItWorks from './pages/HowItWorks';

// The Meme Factory mark: a goofy gold coin with its tongue out.
function Mark() {
  return (
    <svg className="mark" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="14.2" fill="#ffd426" stroke="#14110f" strokeWidth="2" />
      <circle cx="11.4" cy="13" r="3.6" fill="#fff" stroke="#14110f" strokeWidth="1.6" />
      <circle cx="20.6" cy="13" r="3.6" fill="#fff" stroke="#14110f" strokeWidth="1.6" />
      <circle cx="12.2" cy="13.6" r="1.5" fill="#14110f" />
      <circle cx="19.8" cy="13.6" r="1.5" fill="#14110f" />
      <path d="M8.6 19.2Q16 26.4 23.4 19.2Z" fill="#14110f" />
      <ellipse cx="17.6" cy="22.6" rx="2.4" ry="2" fill="#ff3d9a" />
    </svg>
  );
}

export default function App() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const route = useRoute();
  const [balance, setBalance] = useState<number | null>(null);
  const [airdropMsg, setAirdropMsg] = useState('');
  const [airdropping, setAirdropping] = useState(false);

  const refreshBalance = useCallback(async () => {
    if (!publicKey) return setBalance(null);
    try {
      setBalance((await connection.getBalance(publicKey, 'confirmed')) / LAMPORTS_PER_SOL);
    } catch {
      setBalance(null);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    refreshBalance();
    const t = setInterval(refreshBalance, 15000);
    return () => clearInterval(t);
  }, [refreshBalance]);

  async function airdrop() {
    if (!publicKey) return;
    setAirdropping(true);
    setAirdropMsg('');
    try {
      const sig = await connection.requestAirdrop(publicKey, LAMPORTS_PER_SOL);
      const latest = await connection.getLatestBlockhash();
      await connection.confirmTransaction({ signature: sig, ...latest }, 'confirmed');
      setAirdropMsg('Received 1 SOL of test money.');
      refreshBalance();
    } catch {
      setAirdropMsg('The public faucet is rate limited. Get test SOL at');
    } finally {
      setAirdropping(false);
    }
  }

  const section = route.name === 'coin' ? 'explore' : route.name === 'admin' ? '' : route.name;
  const link = (name: 'explore' | 'launch' | 'how', label: string) => (
    <a className={section === name ? 'on' : ''} href={href[name]} aria-current={section === name ? 'page' : undefined}>
      {label}
    </a>
  );

  return (
    <>
      <div className="banner">
        {IS_MAINNET ? (
          <>Live on Solana mainnet. Real money: memecoins are extremely risky, you can lose everything. Not financial advice.</>
        ) : (
          <>You are on Solana <b>{CLUSTER}</b>. Coins made here are test coins with no value.</>
        )}
      </div>
      <header className="top">
        <div className="wrap top-in">
          <a className="brand" href={href.explore} aria-label="Meme Factory home">
            <Mark />
            Meme Factory
          </a>
          <nav className="nav" aria-label="Main">
            {link('explore', 'Explore')}
            {link('launch', 'Launch')}
            {link('how', 'How it works')}
          </nav>
          <div className="wallet-area">
            {publicKey && balance !== null && <span className="bal mono">{balance.toFixed(3)} SOL</span>}
            {publicKey && CLUSTER === 'devnet' && (
              <button className="btn" onClick={airdrop} disabled={airdropping}>
                {airdropping ? 'Requesting…' : 'Get test SOL'}
              </button>
            )}
            <WalletMultiButton />
          </div>
        </div>
      </header>

      {airdropMsg && (
        <div className="wrap">
          <p className="note">
            {airdropMsg}{' '}
            <a href="https://faucet.solana.com" target="_blank" rel="noreferrer">faucet.solana.com</a>
          </p>
        </div>
      )}

      <main>
        {route.name === 'explore' && <Explore />}
        {route.name === 'launch' && <Launch balance={balance} onCreated={refreshBalance} />}
        {route.name === 'admin' && <Admin />}
        {route.name === 'how' && <HowItWorks />}
        {route.name === 'coin' && <CoinPage mint={route.mint} />}
      </main>

      <footer className="wrap foot muted">
        {IS_MAINNET
          ? 'Meme Factory is unaudited beta software. Coins are not endorsed by Meme Factory. Only risk what you can lose.'
          : `Prototype running on ${CLUSTER}. Not audited.`}{' '}
        <a href={href.how}>How it works</a>
      </footer>
    </>
  );
}
