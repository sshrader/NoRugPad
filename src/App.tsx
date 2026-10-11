import { useCallback, useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { CLUSTER } from './config';
import CreateCoinForm from './components/CreateCoinForm';
import CoinList from './components/CoinList';
import CatWire from './components/CatWire';

export default function App() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [airdropMsg, setAirdropMsg] = useState('');
  const [airdropping, setAirdropping] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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
      setAirdropMsg('The public faucet is rate limited. Get test SOL at faucet.solana.com instead.');
    } finally {
      setAirdropping(false);
    }
  }

  return (
    <>
      <div className="banner">
        You are on Solana <b>{CLUSTER}</b>. Coins made here are test coins with no value.
      </div>
      <header className="top">
        <div className="wrap top-in">
          <h1 className="brand">Pawpad</h1>
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
      <main className="wrap">
        {airdropMsg && <p className="note">{airdropMsg} <a href="https://faucet.solana.com" target="_blank" rel="noreferrer">faucet.solana.com</a></p>}
        <section className="hero">
          <p className="eyebrow mono">Solana {CLUSTER}</p>
          <h2>Launch a coin. Get a cat.</h2>
          <p className="muted">
            Your wallet creates the token, attaches its name and image, and revokes mint and freeze
            authority in a single transaction. A cat is paired to the coin when it is registered.
          </p>
        </section>
        <div className="layout">
          <CreateCoinForm
            balance={balance}
            onCreated={() => {
              refreshBalance();
              setRefreshKey((k) => k + 1);
            }}
          />
          <div className="rightcol">
            <CatWire refreshKey={refreshKey} />
            <CoinList refreshKey={refreshKey} />
          </div>
        </div>
      </main>
      <footer className="wrap foot muted">
        Prototype for {CLUSTER} only. Not audited. Do not point this at mainnet without a security review and legal advice.
      </footer>
    </>
  );
}
