/**
 * Move a full coin from the bonding curve to a regular DEX pool (DAMM v2), by hand.
 *   npm run dbc-migrate -- <mint address>                     look only: shows how full the curve is and whether it already migrated
 *   npm run dbc-migrate -- <mint address> --confirm-mainnet   really migrate (needs a little SOL in the key-file wallet)
 * Meteora runs a service that normally does this; use this script (or https://migrator.meteora.ag)
 * to test graduation on devnet. The curve must be 100% full first.
 */
import 'dotenv/config';
import type { Keypair } from '@solana/web3.js';
import { connect, loadPartner, requireMainnetConfirm } from './common';
import { DAMM_V2_MIGRATION_FEE_ADDRESS, DynamicBondingCurveClient, MigrationFeeOption } from '@meteora-ag/dynamic-bonding-curve-sdk';

const mint = process.argv[2];
if (!mint) throw new Error('Usage: npm run dbc-migrate -- <mint address>');

const partner = loadPartner();
const { connection, mainnet } = await connect();
const client = new DynamicBondingCurveClient(connection, 'confirmed');

const found = await client.state.getPoolByBaseMint(mint);
if (!found) throw new Error('No pool found for that mint.');
const progress = await client.state.getPoolQuoteTokenCurveProgress(found.publicKey);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const acct: any = found.account;
const state: any = acct.poolState ?? acct; // eslint-disable-line @typescript-eslint/no-explicit-any
const migrated = !!state.isMigrated;
console.log(`Pool ${found.publicKey.toBase58()}  curve ${(progress * 100).toFixed(1)}% full  ${migrated ? 'ALREADY MIGRATED' : 'not migrated'}`);
if (migrated) {
  console.log('Nothing to do: this coin already trades on its DEX pool.');
  process.exit(0);
}
if (progress < 1) throw new Error('The curve is not full yet, so it cannot graduate. Keep buying.');
console.log(`Key-file wallet ${partner.publicKey.toBase58()} will pay for the migration.`);
requireMainnetConfirm(mainnet, 'Migrating');

// Newer SDK versions return { transaction, firstPositionNftKeypair, secondPositionNftKeypair }.
// The two position keypairs must sign as well. Older versions return the transaction directly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const res: any = await client.migration.migrateToDammV2({
  payer: partner.publicKey,
  pool: found.publicKey,
  dammConfig: DAMM_V2_MIGRATION_FEE_ADDRESS[MigrationFeeOption.Customizable],
});
const tx = res.transaction ?? res;
const signers: Keypair[] = [partner, res.firstPositionNftKeypair, res.secondPositionNftKeypair].filter(Boolean);
const latest = await connection.getLatestBlockhash('confirmed');
tx.feePayer = partner.publicKey;
tx.recentBlockhash = latest.blockhash;
tx.sign(...signers);
const sig = await connection.sendRawTransaction(tx.serialize());
await connection.confirmTransaction({ signature: sig, ...latest }, 'confirmed');
console.log(`Migrated. tx ${sig}\nThe coin now trades on a DAMM v2 pool. If this script fails, try https://migrator.meteora.ag`);
