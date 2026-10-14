import { Buffer } from 'buffer/';
import { Connection, Keypair, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
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

  await dryRun(connection, tx);
  onStage('signing');
  const signature = await wallet.sendTransaction(tx, connection, { signers: [mint] });
  onStage('confirming');
  await connection.confirmTransaction({ signature, ...latest }, 'confirmed');
  return { mint: mint.publicKey.toBase58(), signature };
}

/** Dry-runs a transaction so a failure shows its real reason instead of the wallet's generic "Unexpected error".
 *  Uses a signature-free simulation, because the wallet has not signed yet. */
async function dryRun(connection: Connection, tx: Transaction) {
  const vtx = new VersionedTransaction(tx.compileMessage());
  const sim = await connection.simulateTransaction(vtx, { sigVerify: false, replaceRecentBlockhash: true, commitment: 'confirmed' });
  if (sim.value.err) {
    const logs = (sim.value.logs ?? []).filter((l) => /error|fail|insufficient|custom program/i.test(l)).slice(-3).join(' | ');
    throw new Error(`The network rejected this transaction: ${JSON.stringify(sim.value.err)} ${logs}`.trim());
  }
}

export type Quote = { out: number; min: number };

// Some SDK versions wrap the pool fields in .poolState; accept both shapes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fields = (account: any) => account?.poolState ?? account;

const configCache = new Map<string, unknown>();

// Looks up ONE pool by its address (cheap), and caches the config (it never changes).
// Searching all pools by mint is a heavy RPC call that public endpoints rate-limit.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function poolAndConfig(connection: Connection, poolAddress: string): Promise<{ client: DynamicBondingCurveClient; pool: { publicKey: PublicKey; account: any }; config: any }> {
  const client = dbcClient(connection);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = await client.state.getPool(poolAddress);
  const account = raw?.account ?? raw;
  if (!account) throw new Error('This coin has no trading pool yet.');
  const cfgKey = fields(account).config;
  const id = cfgKey.toBase58();
  if (!configCache.has(id)) configCache.set(id, await client.state.getPoolConfig(cfgKey));
  return { client, pool: { publicKey: new PublicKey(poolAddress), account }, config: configCache.get(id) };
}

/** Is the pool still on the curve? After graduation, trading happens on a regular DEX instead. */
export async function curveStatus(connection: Connection, poolAddress: string): Promise<{ migrated: boolean; progress: number }> {
  const { client, pool } = await poolAndConfig(connection, poolAddress);
  const progress = await client.state.getPoolQuoteTokenCurveProgress(pool.publicKey);
  return { migrated: fields(pool.account).isMigrated !== 0, progress };
}

// Some SDK versions leave minimumAmountOut optional; derive it from the slippage setting instead of using 0.
const minOut = (q: { outputAmount: BN; minimumAmountOut?: BN }, slippageBps: number): BN =>
  q.minimumAmountOut ?? q.outputAmount.muln(10_000 - slippageBps).divn(10_000);

/** amount is in SOL when buying, in coin units when selling. */
export async function quoteSwap(connection: Connection, poolAddress: string, side: 'buy' | 'sell', amount: number, slippageBps = 100): Promise<Quote> {
  const { client, pool, config } = await poolAndConfig(connection, poolAddress);
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
    eligibleForFirstSwapWithMinFee: false, // assume the normal fee: a slightly lower estimate is the safe side
  } as Parameters<typeof client.pool.swapQuote2>[0]);
  const dec = side === 'buy' ? BASE_DECIMALS : QUOTE_DECIMALS;
  return { out: fromUnits(q.outputAmount, dec), min: fromUnits(minOut(q, slippageBps), dec) };
}

export async function swap(
  connection: Connection,
  wallet: WalletContextState,
  poolAddress: string,
  side: 'buy' | 'sell',
  amount: number,
  slippageBps = 100,
): Promise<string> {
  if (!wallet.publicKey || !wallet.sendTransaction) throw new Error('Connect a wallet first.');
  const { client, pool, config } = await poolAndConfig(connection, poolAddress);
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
    eligibleForFirstSwapWithMinFee: false, // assume the normal fee: a slightly lower estimate is the safe side
  } as Parameters<typeof client.pool.swapQuote2>[0]);
  const tx = await client.pool.swap2({
    owner: wallet.publicKey,
    pool: pool.publicKey,
    swapBaseForQuote: side === 'sell',
    referralTokenAccount: null,
    swapMode: SwapMode.PartialFill,
    amountIn,
    minimumAmountOut: minOut(q, slippageBps),
  });
  const latest = await connection.getLatestBlockhash('confirmed');
  tx.feePayer = wallet.publicKey;
  tx.recentBlockhash = latest.blockhash;
  await dryRun(connection, tx);
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
