import { clusterApiUrl } from '@solana/web3.js';

export type Cluster = 'devnet' | 'testnet';

export const CLUSTER: Cluster = import.meta.env.VITE_CLUSTER === 'testnet' ? 'testnet' : 'devnet';
export const RPC_URL: string = import.meta.env.VITE_RPC_URL || clusterApiUrl(CLUSTER);

export const explorerAddress = (address: string) => `https://explorer.solana.com/address/${address}?cluster=${CLUSTER}`;
export const explorerTx = (signature: string) => `https://explorer.solana.com/tx/${signature}?cluster=${CLUSTER}`;

// A launch costs roughly 0.009 SOL in rent plus fees. Keep a margin.
export const MIN_SOL_TO_LAUNCH = 0.02;

// Set after running `npm run dbc-config`. When present, coins launch on a Meteora bonding curve and can be traded.
// When empty, the app falls back to plain tokens with no trading.
export const DBC_CONFIG: string = (import.meta.env.VITE_DBC_CONFIG || '').trim();
export const CURVE_ON = DBC_CONFIG.length > 0;
// A curve launch needs a little more SOL for the pool accounts.
export const MIN_SOL_TO_LAUNCH_CURVE = 0.05;
