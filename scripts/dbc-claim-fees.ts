/**
 * Claim the trading fees you earned as the partner (the feeClaimer in your config).
 *   npm run dbc-fees            claim from every pool
 *   npm run dbc-fees -- --check just show what is waiting
 * Uses .devnet-keypair.json, the same wallet that created the config.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import BN from 'bn.js';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';

const checkOnly = process.argv.includes('--check');
const config = (process.env.DBC_CONFIG || '').trim();
if (!config) throw new Error('DBC_CONFIG is empty. Run `npm run dbc-config` first.');

const KEY_FILE = path.resolve('.devnet-keypair.json');
const partner = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'))));
const connection = new Connection(process.env.SOLANA_RPC_URL || clusterApiUrl('devnet'), 'confirmed');
const client = new DynamicBondingCurveClient(connection, 'confirmed');

const fees = await client.state.getPoolsFeesByConfig(new PublicKey(config));
const sol = (b: BN) => Number(b.toString()) / LAMPORTS_PER_SOL;
let total = 0;
console.log(`\nPartner wallet ${partner.publicKey.toBase58()}`);
console.log(`${fees.length} pool(s) under this config\n`);

for (const f of fees) {
  const owed = sol(f.partnerQuoteFee);
  total += owed;
  console.log(`${f.poolAddress.toBase58()}  waiting: ${owed.toFixed(6)} SOL   all-time fees: ${sol(f.totalTradingQuoteFee).toFixed(6)} SOL`);
  if (checkOnly || f.partnerQuoteFee.isZero()) continue;

  const tx = await client.partner.claimPartnerTradingFee({
    pool: f.poolAddress,
    feeClaimer: partner.publicKey,
    payer: partner.publicKey,
    maxBaseAmount: new BN(0),
    maxQuoteAmount: f.partnerQuoteFee,
  });
  const latest = await connection.getLatestBlockhash('confirmed');
  tx.feePayer = partner.publicKey;
  tx.recentBlockhash = latest.blockhash;
  tx.sign(partner);
  const sig = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction({ signature: sig, ...latest }, 'confirmed');
  console.log(`  claimed. tx ${sig}`);
}

console.log(`\n${checkOnly ? 'Waiting to claim' : 'Total'}: ${total.toFixed(6)} SOL`);
