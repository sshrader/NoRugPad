import { Buffer } from 'buffer/';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import {
  DynamicBondingCurveClient,
  SwapMode,
  getCurrentPoint,
} from '@meteora-ag/dynamic-bonding-curve-sdk';
import BN from 'bn.js';
import { DBC_CONFIG } from '../config';

void Buffer;

export const BASE_DECIMALS = 6;
export const QUOTE_DECIMALS = 9; // SOL

export const dbcClient = (connection: Connection) => new DynamicBondingCurveClient(connection, 'confirmed');

/** One transaction: creates the token and its bonding-curve pool. Same shape as createCoin() for the plain flow. */
export async function createCoinOnCurve(
  connection: Connection,
  wallet: WalletContextState,
  input: { name: string; symbol: string; uri: string },
  onStage: (s: 'signing' | 'confirming') => void,
): Promise<{ mint: string; signature: string }> {
  if (!wallet.publicKey || !wallet.sendTransaction) throw new Error('Connect a wallet first.');
  const mint = Keypair.generate();
  const tx = await dbcClient(connection).creator.createPool({
    baseMint: mint.publicKey,
    config: new PublicKey(DBC_CONFIG),
    name: input.name,
    symbol: input.symbol,
    uri: input.uri,
    payer: wallet.publicKey,
    poolCreator: wallet.publicKey,
  });
  const latest = await connection.getLatestBlockhash('confirmed');
  tx.feePayer = wallet.publicKey;
  tx.recentBlockhash = latest.blockhash;

  onStage('signing');
  const signature = await wallet.sendTransaction(tx, connection, { signers: [mint] });
  onStage('confirming');
  await connection.confirmTransaction({ signature, ...latest }, 'confirmed');
  return { mint: mint.publicKey.toBase58(), signature };
}

export type Quote = { out: number; min: number };

// Some SDK versions wrap the pool fields in .poolState; accept both shapes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fields = (account: any) => account?.poolState ?? account;

async function poolAndConfig(connection: Connection, mint: string) {
  const client = dbcClient(connection);
  const pool = await client.state.getPoolByBaseMint(mint);
  if (!pool) throw new Error('This coin has no trading pool yet.');
  const config = await client.state.getPoolConfig(fields(pool.account).config);
  return { client, pool, config };
}

/** Is the pool still on the curve? After graduation, trading happens on a regular DEX instead. */
export async function curveStatus(connection: Connection, mint: string): Promise<{ migrated: boolean; progress: number }> {
  const { client, pool } = await poolAndConfig(connection, mint);
  const progress = await client.state.getPoolQuoteTokenCurveProgress(pool.publicKey);
  return { migrated: fields(pool.account).isMigrated !== 0, progress };
}

/** amount is in SOL when buying, in coin units when selling. */
export async function quoteSwap(connection: Connection, mint: string, side: 'buy' | 'sell', amount: number, slippageBps = 100): Promise<Quote> {
  const { client, pool, config } = await poolAndConfig(connection, mint);
  const currentPoint = await getCurrentPoint(connection, config.activationType);
  const amountIn = toUnits(amount, side === 'buy' ? QUOTE_DECIMALS : BASE_DECIMALS);
  const q = client.pool.swapQuote2({
    virtualPool: pool.account,
    config,
    swapBaseForQuote: side === 'sell',
    amountIn,
    slippageBps,
    hasReferral: false,
    currentPoint,
    swapMode: SwapMode.PartialFill,
  });
  const dec = side === 'buy' ? BASE_DECIMALS : QUOTE_DECIMALS;
  return { out: fromUnits(q.outputAmount, dec), min: fromUnits(q.minimumAmountOut, dec) };
}

export async function swap(
  connection: Connection,
  wallet: WalletContextState,
  mint: string,
  side: 'buy' | 'sell',
  amount: number,
  slippageBps = 100,
): Promise<string> {
  if (!wallet.publicKey || !wallet.sendTransaction) throw new Error('Connect a wallet first.');
  const { client, pool, config } = await poolAndConfig(connection, mint);
  const currentPoint = await getCurrentPoint(connection, config.activationType);
  const amountIn = toUnits(amount, side === 'buy' ? QUOTE_DECIMALS : BASE_DECIMALS);
  const q = client.pool.swapQuote2({
    virtualPool: pool.account,
    config,
    swapBaseForQuote: side === 'sell',
    amountIn,
    slippageBps,
    hasReferral: false,
    currentPoint,
    swapMode: SwapMode.PartialFill,
  });
  const tx = await client.pool.swap2({
    owner: wallet.publicKey,
    pool: pool.publicKey,
    swapBaseForQuote: side === 'sell',
    referralTokenAccount: null,
    swapMode: SwapMode.PartialFill,
    amountIn,
    minimumAmountOut: q.minimumAmountOut,
  });
  const latest = await connection.getLatestBlockhash('confirmed');
  tx.feePayer = wallet.publicKey;
  tx.recentBlockhash = latest.blockhash;
  const signature = await wallet.sendTransaction(tx, connection);
  await connection.confirmTransaction({ signature, ...latest }, 'confirmed');
  return signature;
}

function toUnits(n: number, decimals: number): BN {
  // Go through a string so large amounts do not lose precision as floats.
  const [whole, frac = ''] = n.toFixed(decimals).split('.');
  return new BN(whole + frac.padEnd(decimals, '0').slice(0, decimals));
}

function fromUnits(b: BN, decimals: number): number {
  return Number(b.toString()) / 10 ** decimals;
}
