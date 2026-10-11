/**
 * Checks the coin-creation transaction WITHOUT Phantom or the browser.
 *
 *   npm run dry-run            builds the transaction and checks its shape (works offline)
 *   npm run dry-run -- --send  also airdrops devnet SOL to a throwaway keypair, sends the
 *                              transaction for real, and reads the mint back from the chain
 *
 * Run this first. If --send works, the on-chain part is fine and any later problem is in the
 * browser or wallet layer.
 */
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, clusterApiUrl, sendAndConfirmTransaction } from '@solana/web3.js';
import { getMint, getMinimumBalanceForRentExemptMint } from '@solana/spl-token';
import { buildCreateCoinTx, DECIMALS, TOTAL_SUPPLY } from '../src/lib/createCoin';

const send = process.argv.includes('--send');
const payer = Keypair.generate();
const mint = Keypair.generate();
const input = { name: 'Dry Run Cat', symbol: 'DRYCAT', uri: 'https://example.com/metadata.json' };

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('ok  ', msg);
}

async function main() {
  // Offline checks
  const tx = buildCreateCoinTx({ payer: payer.publicKey, mint: mint.publicKey, rentLamports: 1_461_600, input });
  const programs = tx.instructions.map((i) => i.programId.toBase58());
  assert(tx.instructions.length === 7, 'transaction has 7 instructions');

  const METADATA_PROGRAM = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';
  const metaIx = programs.indexOf(METADATA_PROGRAM);
  const lastTokenIx = programs.length - 1;
  assert(metaIx >= 0, 'metadata instruction present');
  assert(metaIx < lastTokenIx - 1, 'metadata is created BEFORE the two authority revokes');
  assert(tx.instructions[5].data[0] === 6 && tx.instructions[5].data[1] === 0, 'instruction 6 is SetAuthority(MintTokens)');
  assert(tx.instructions[6].data[0] === 6 && tx.instructions[6].data[1] === 1, 'instruction 7 is SetAuthority(FreezeAccount)');

  tx.feePayer = payer.publicKey;
  tx.recentBlockhash = PublicKey.default.toBase58(); // placeholder, only to measure size
  tx.sign(payer, mint);
  const size = tx.serialize().length;
  assert(size <= 1232, `serialized size ${size} bytes fits the 1232 byte limit`);

  if (!send) return console.log('\nOffline checks passed. Re-run with  -- --send  to test against devnet.');

  // Devnet test
  const connection = new Connection(process.env.SOLANA_RPC_URL || clusterApiUrl('devnet'), 'confirmed');
  console.log('\nRequesting airdrop…');
  const sig = await connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL);
  const latest = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ signature: sig, ...latest }, 'confirmed');

  const rent = await getMinimumBalanceForRentExemptMint(connection);
  const real = buildCreateCoinTx({ payer: payer.publicKey, mint: mint.publicKey, rentLamports: rent, input });
  const txSig = await sendAndConfirmTransaction(connection, real, [payer, mint], { commitment: 'confirmed' });
  console.log('sent', txSig);

  const info = await getMint(connection, mint.publicKey, 'confirmed');
  assert(info.mintAuthority === null, 'mint authority is revoked on chain');
  assert(info.freezeAuthority === null, 'freeze authority is revoked on chain');
  assert(info.decimals === DECIMALS, `decimals = ${DECIMALS}`);
  assert(info.supply === TOTAL_SUPPLY * 10n ** BigInt(DECIMALS), 'supply is 1,000,000,000');
  console.log(`\nMint: https://explorer.solana.com/address/${mint.publicKey.toBase58()}?cluster=devnet`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
