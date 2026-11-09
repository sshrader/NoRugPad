/**
 * Read-only check: could this token be used as the quote token (the token coins are priced and traded in) on a Meteora
 * Dynamic Bonding Curve? It reads the token's mint account and compares it with Meteora's published rules.
 * It spends nothing and needs no wallet.
 *
 *   npm run dbc-check-quote -- <token mint address>
 *
 * Point SOLANA_RPC_URL at a MAINNET RPC (for example your Helius URL), because the token lives on mainnet.
 * The rules live in scripts/quote-rules.mjs, from https://docs.meteora.ag/core-products/dbc/token-2022-support
 */
import 'dotenv/config';
import { Connection, PublicKey } from '@solana/web3.js';
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getExtensionTypes,
  getMint,
  getTransferFeeConfig,
} from '@solana/spl-token';
import { judgeQuote } from './quote-rules.mjs';

const NATIVE_MINT_2022 = '9pan9bMn5HatX4EJdBwg9VgCa7Uz5HL8N1m5D3NdXejP';
const MAINNET_GENESIS = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';

async function main() {
  const arg = process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (!arg) throw new Error('Usage: npm run dbc-check-quote -- <token mint address>');
  let mint: PublicKey;
  try {
    mint = new PublicKey(arg);
  } catch {
    throw new Error(`"${arg}" is not a valid Solana address.`);
  }
  const url = process.env.SOLANA_RPC_URL;
  if (!url) throw new Error('Set SOLANA_RPC_URL to a mainnet RPC address (for example your Helius URL) in .env first.');
  const connection = new Connection(url, 'confirmed');
  const onMainnet = (await connection.getGenesisHash()) === MAINNET_GENESIS;
  console.log(`Network: ${onMainnet ? 'mainnet' : 'NOT mainnet (a mainnet token will not be found here)'}`);

  const acct = await connection.getAccountInfo(mint);
  if (!acct) throw new Error('No account at that address on this network.');
  const owner = acct.owner.toBase58();
  const program = owner === TOKEN_PROGRAM_ID.toBase58() ? 'spl-token' : owner === TOKEN_2022_PROGRAM_ID.toBase58() ? 'token-2022' : 'other';
  console.log(`Mint:     ${mint.toBase58()}`);
  console.log(`Program:  ${program === 'other' ? `${owner} (not a token program)` : program}`);

  let extensions: string[] = [];
  let transferFee: { zero: boolean; authorityRevoked: boolean } | null = null;
  let mintAuthority = false;
  let freezeAuthority = false;
  if (program !== 'other') {
    const programId = program === 'token-2022' ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
    const m = await getMint(connection, mint, 'confirmed', programId);
    mintAuthority = m.mintAuthority !== null;
    freezeAuthority = m.freezeAuthority !== null;
    console.log(`Decimals: ${m.decimals}`);
    console.log(`Supply:   ${m.supply.toString()} (raw units)`);
    console.log(`Mint authority:   ${m.mintAuthority ? m.mintAuthority.toBase58() : 'none'}`);
    console.log(`Freeze authority: ${m.freezeAuthority ? m.freezeAuthority.toBase58() : 'none'}`);
    if (program === 'token-2022') {
      extensions = getExtensionTypes(m.tlvData).map((t) => ExtensionType[t] ?? `Extension #${t}`);
      console.log(`Extensions: ${extensions.length ? extensions.join(', ') : 'none'}`);
      if (extensions.includes('TransferFeeConfig')) {
        const cfg = getTransferFeeConfig(m);
        if (cfg) {
          const isZero = (f: { transferFeeBasisPoints: number; maximumFee: bigint }) => f.transferFeeBasisPoints === 0 || f.maximumFee === 0n;
          transferFee = {
            zero: isZero(cfg.olderTransferFee) && isZero(cfg.newerTransferFee),
            authorityRevoked: !cfg.transferFeeConfigAuthority || cfg.transferFeeConfigAuthority.equals(PublicKey.default),
          };
          console.log(`Transfer fee: older ${cfg.olderTransferFee.transferFeeBasisPoints} bps, newer ${cfg.newerTransferFee.transferFeeBasisPoints} bps, authority ${transferFee.authorityRevoked ? 'revoked' : 'still set'}`);
        }
      }
    }
  }

  const v = judgeQuote({ program, isNativeMint2022: mint.toBase58() === NATIVE_MINT_2022, extensions, transferFee, mintAuthority, freezeAuthority });
  console.log('');
  console.log(v.level === 'ok' ? 'RESULT: allowed with no approval.' : v.level === 'badge' ? 'RESULT: needs an approval from Meteora (a TokenBadge) before it can be a quote token.' : 'RESULT: cannot be used as a quote token.');
  for (const r of v.reasons) console.log(`  - ${r}`);
  if (v.notes.length) {
    console.log('\nThings to know:');
    for (const n of v.notes) console.log(`  - ${n}`);
  }
  console.log('\nThis follows Meteora\'s published rules. Confirm with Meteora before building on it, and note it says nothing about whether the token is legal to use.');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
