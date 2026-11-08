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

// The NoRugPad mark: a shield holding a checked gold coin.
function Mark() {
  return (
    <svg className="mark" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 1.5 28.5 6v9.2c0 7.3-5 12.6-12.5 15.3C8.5 27.8 3.5 22.5 3.5 15.2V6z" fill="#161b36" stroke="#f4b63f" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="16" cy="15.5" r="7" fill="#f4b63f" />
      <path d="m12.5 15.7 2.4 2.5 4.8-5.2" fill="none" stroke="#1a1305" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
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
          <a className="brand" href={href.explore} aria-label="NoRugPad home">
            <Mark />
            NoRugPad
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
          ? 'NoRugPad is unaudited beta software. Coins are not endorsed by NoRugPad. Only risk what you can lose.'
          : `Prototype running on ${CLUSTER}. Not audited.`}{' '}
        <a href={href.how}>How it works</a>
      </footer>
    </>
  );
}
