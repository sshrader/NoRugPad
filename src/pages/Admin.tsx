import { useCallback, useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey, VersionedTransaction } from '@solana/web3.js';
import BN from 'bn.js';
import { DBC_CONFIG, FEE_CLAIMER, explorerTx } from '../config';
import { dbcClient } from '../lib/dbc';

type Row = { pool: string; waiting: BN; total: BN };
const sol = (b: BN) => Number(b.toString()) / LAMPORTS_PER_SOL;

// Fee claiming for the partner wallet. Works with any wallet Phantom supports, including a Ledger,
// so the fee claimer never has to be a key file on a server. The chain only lets the real fee claimer sign.
export default function Admin() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [claimer, setClaimer] = useState(''); // the feeClaimer stored in the curve config on chain

  const me = wallet.publicKey?.toBase58() ?? '';
  const expected = claimer || FEE_CLAIMER;
  const allowed = !!me && (!expected || me === expected);

  const load = useCallback(async () => {
    if (!DBC_CONFIG) return;
    setMsg('');
    try {
      const client = dbcClient(connection);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cfg: any = await client.state.getPoolConfig(new PublicKey(DBC_CONFIG));
      const c = cfg?.account ?? cfg;
      if (c?.feeClaimer) setClaimer(c.feeClaimer.toBase58());
      const fees = await client.state.getPoolsFeesByConfig(new PublicKey(DBC_CONFIG));
      setRows(fees.map((f) => ({ pool: f.poolAddress.toBase58(), waiting: f.partnerQuoteFee as BN, total: f.totalTradingQuoteFee as BN })));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not load fees.');
    }
  }, [connection]);

  useEffect(() => {
    if (me) void load();
  }, [me, load]);

  async function claim(list: Row[]) {
    if (!wallet.publicKey || !wallet.sendTransaction) return;
    setBusy(true);
    setMsg('');
    try {
      const client = dbcClient(connection);
      for (const r of list) {
        if (r.waiting.isZero()) continue;
        const tx = await client.partner.claimPartnerTradingFee({
          pool: new PublicKey(r.pool),
          feeClaimer: wallet.publicKey,
          payer: wallet.publicKey,
          maxBaseAmount: new BN(0),
          maxQuoteAmount: r.waiting,
        });
        const latest = await connection.getLatestBlockhash('confirmed');
        tx.feePayer = wallet.publicKey;
        tx.recentBlockhash = latest.blockhash;
        const sim = await connection.simulateTransaction(new VersionedTransaction(tx.compileMessage()), { sigVerify: false, replaceRecentBlockhash: true });
        if (sim.value.err) {
          throw new Error(`Claim would fail: ${JSON.stringify(sim.value.err)} ${(sim.value.logs ?? []).slice(-3).join(' | ')}`);
        }
        const signature = await wallet.sendTransaction(tx, connection);
        await connection.confirmTransaction({ signature, ...latest }, 'confirmed');
        setMsg(`Claimed ${sol(r.waiting).toFixed(6)} SOL. `);
        setMsg((m) => m + explorerTx(signature));
      }
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Claim failed.');
    } finally {
      setBusy(false);
    }
  }

  const totalWaiting = (rows ?? []).reduce((a, r) => a + sol(r.waiting), 0);

  return (
    <div className="wrap page">
      <h2>Fees</h2>
      {!DBC_CONFIG && <p className="muted">No curve config is set.</p>}
      {!wallet.publicKey && <p className="muted">Connect the fee-claimer wallet.</p>}
      {wallet.publicKey && !allowed && (
        <p className="muted">
          This wallet is not this config's fee claimer, so a claim would fail. The claimer is{' '}
          <span className="mono">{expected}</span>. Connect that wallet, or use a config created with your new wallet as DBC_FEE_CLAIMER.
        </p>
      )}
      {allowed && (
        <>
          <p>
            Waiting to claim: <b className="mono">{totalWaiting.toFixed(6)} SOL</b> across {rows?.length ?? 0} pool(s).
          </p>
          <button className="btn primary" disabled={busy || !rows || totalWaiting === 0} onClick={() => claim(rows ?? [])}>
            {busy ? 'Claiming…' : 'Claim all'}
          </button>
          <ul className="checks">
            {(rows ?? []).map((r) => (
              <li key={r.pool} className="mono small">
                {r.pool.slice(0, 6)}…{r.pool.slice(-4)} · waiting {sol(r.waiting).toFixed(6)} · all-time {sol(r.total).toFixed(6)}
              </li>
            ))}
          </ul>
        </>
      )}
      {msg && <p className="status" role="status">{msg}</p>}
    </div>
  );
}
