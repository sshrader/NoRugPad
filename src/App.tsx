import { useCallback, useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { CLUSTER, IS_MAINNET } from './config';
import { href, useRoute } from './router';
import Explore from './pages/Explore';
import Launch from './pages/Launch';
import Wire from './pages/Wire';
import CoinPage from './pages/CoinPage';
import Admin from './pages/Admin';

function Paw() {
  return (
    <svg className="paw" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
      <ellipse cx="8" cy="13" rx="2.6" ry="3.4" />
      <ellipse cx="13" cy="8" rx="2.6" ry="3.6" />
      <ellipse cx="19" cy="8" rx="2.6" ry="3.6" />
      <ellipse cx="24" cy="13" rx="2.6" ry="3.4" />
      <path d="M16 15c-4.3 0-7.6 3.8-7.6 7 0 2.4 1.9 3.7 4.3 3.7 1.3 0 2.2-.6 3.3-.6s2 .6 3.3.6c2.4 0 4.3-1.3 4.3-3.7 0-3.2-3.3-7-7.6-7z" />
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
  const link = (name: 'explore' | 'launch' | 'wire', label: string) => (
    <a className={section === name ? 'on' : ''} href={href[name]} aria-current={section === name ? 'page' : undefined}>
      {label}
    </a>
  );

  return (
    <>
      <div className="banner">
        {IS_MAINNET ? (
          <>Beta on Solana mainnet. Real money: memecoins are extremely risky, you can lose everything. Not financial advice.</>
        ) : (
          <>You are on Solana <b>{CLUSTER}</b>. Coins made here are test coins with no value.</>
        )}
      </div>
      <header className="top">
        <div className="wrap top-in">
          <a className="brand" href={href.explore} aria-label="Pawpad home">
            <Paw />
            Pawpad
          </a>
          <nav className="nav" aria-label="Main">
            {link('explore', 'Explore')}
            {link('launch', 'Launch')}
            {link('wire', 'Paw Wire')}
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
        {route.name === 'wire' && <Wire />}
        {route.name === 'admin' && <Admin />}
        {route.name === 'coin' && <CoinPage mint={route.mint} />}
      </main>

      <footer className="wrap foot muted">
        {IS_MAINNET
          ? 'Pawpad is unaudited beta software. Pets are AI characters and their posts are not advice. Coins are not endorsed by Pawpad. Only risk what you can lose.'
          : `Prototype running on ${CLUSTER}. Not audited.`}
      </footer>
    </>
  );
}
