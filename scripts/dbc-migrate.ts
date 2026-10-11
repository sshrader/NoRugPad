/**
 * Move a full coin from the bonding curve to a regular DEX pool (DAMM v2), by hand.
 *   npm run dbc-migrate -- <mint address>
 * Meteora runs a service that normally does this; use this script (or https://migrator.meteora.ag)
 * to test graduation on devnet. The curve must be 100% full first.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Connection, Keypair, clusterApiUrl } from '@solana/web3.js';
import { DAMM_V2_MIGRATION_FEE_ADDRESS, DynamicBondingCurveClient, MigrationFeeOption } from '@meteora-ag/dynamic-bonding-curve-sdk';

const mint = process.argv[2];
if (!mint) throw new Error('Usage: npm run dbc-migrate -- <mint address>');

const partner = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(path.resolve('.devnet-keypair.json'), 'utf8'))));
const connection = new Connection(process.env.SOLANA_RPC_URL || clusterApiUrl('devnet'), 'confirmed');
const client = new DynamicBondingCurveClient(connection, 'confirmed');

const found = await client.state.getPoolByBaseMint(mint);
if (!found) throw new Error('No pool found for that mint.');
const progress = await client.state.getPoolQuoteTokenCurveProgress(found.publicKey);
console.log(`Pool ${found.publicKey.toBase58()}  curve ${(progress * 100).toFixed(1)}% full`);
if (progress < 1) throw new Error('The curve is not full yet, so it cannot graduate. Keep buying.');

const tx = await client.migration.migrateToDammV2({
  payer: partner.publicKey,
  pool: found.publicKey,
  dammConfig: DAMM_V2_MIGRATION_FEE_ADDRESS[MigrationFeeOption.Customizable],
});
const latest = await connection.getLatestBlockhash('confirmed');
tx.feePayer = partner.publicKey;
tx.recentBlockhash = latest.blockhash;
tx.sign(partner);
const sig = await connection.sendRawTransaction(tx.serialize());
await connection.confirmTransaction({ signature: sig, ...latest }, 'confirmed');
console.log(`Migrated. tx ${sig}\nThe coin now trades on a DAMM v2 pool. If this script fails, try https://migrator.meteora.ag`);
