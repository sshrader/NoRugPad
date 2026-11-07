// Offline test of the safety checks with a fake RPC connection. Run: node scripts/check-test.mjs
import assert from 'node:assert/strict';
import { Keypair, PublicKey } from '@solana/web3.js';
import { checkCoin, rugcheck } from '../server/check.mjs';

const k = () => Keypair.generate().publicKey;
const mint = k(), vault = k(), w1 = k(), w2 = k(), creator = k();
const pda = PublicKey.findProgramAddressSync([Buffer.from('x')], k())[0]; // off-curve owner
const acct = [k(), k(), k(), k()];
const rows = [
  { address: vault, amount: '600000000000000', owner: pda },
  { address: acct[0], amount: '200000000000000', owner: w1 },
  { address: acct[1], amount: '50000000000000', owner: creator },
  { address: acct[2], amount: '10000000000000', owner: w2 },
];
const conn = (mintAuthority) => ({
  getParsedAccountInfo: async () => ({ value: { data: { parsed: { info: { mintAuthority, freezeAuthority: null, supply: '1000000000000000', decimals: 6 } } } } }),
  getTokenLargestAccounts: async () => ({ value: rows.map((r) => ({ address: r.address, amount: r.amount })) }),
  getMultipleParsedAccounts: async () => ({ value: rows.map((r) => ({ data: { parsed: { info: { owner: r.owner.toBase58() } } } })) }),
});

const a = await checkCoin(conn(null), { mint: mint.toBase58(), creator: creator.toBase58() }, { vault: vault.toBase58(), mainnet: false });
assert.equal(a.mintRevoked, true);
assert.equal(a.freezeRevoked, true);
assert.equal(a.holders.curvePct, 60);
assert.equal(a.holders.top1Pct, 20);
assert.equal(a.holders.top10Pct, 26); // 20 + 5 + 1, the vault is not counted
assert.equal(a.holders.creatorPct, 5);
assert.equal(a.rugcheck, null);
assert.match(a.rugcheckNote, /mainnet/);

const m2 = k();
const b = await checkCoin(conn(creator.toBase58()), { mint: m2.toBase58(), creator: creator.toBase58() }, { vault: vault.toBase58(), mainnet: false });
assert.equal(b.mintRevoked, false);

const fakeFetch = async () => ({ ok: true, json: async () => ({ score_normalised: 12, lpLockedPct: 100, risks: [{ name: 'Low liquidity', level: 'warn', description: 'x' }] }) });
const r = await rugcheck(k().toBase58(), fakeFetch);
assert.equal(r.score, 12);
assert.equal(r.lpLockedPct, 100);
assert.equal(r.risks[0].name, 'Low liquidity');
assert.equal(await rugcheck(k().toBase58(), async () => { throw new Error('down'); }), null);
console.log('check-test: ok');
