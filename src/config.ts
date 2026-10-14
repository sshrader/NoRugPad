import { clusterApiUrl } from '@solana/web3.js';

export type Cluster = 'devnet' | 'testnet' | 'mainnet-beta';

const c = import.meta.env.VITE_CLUSTER;
export const CLUSTER: Cluster = c === 'mainnet-beta' || c === 'mainnet' ? 'mainnet-beta' : c === 'testnet' ? 'testnet' : 'devnet';
export const IS_MAINNET = CLUSTER === 'mainnet-beta';
// The free public mainnet RPC blocks browser traffic, so mainnet needs your own RPC URL (restricted to your domain).
if (IS_MAINNET && !import.meta.env.VITE_RPC_URL) console.error('VITE_RPC_URL is required on mainnet.');
export const RPC_URL: string = import.meta.env.VITE_RPC_URL || clusterApiUrl(CLUSTER);
const q = IS_MAINNET ? '' : `?cluster=${CLUSTER}`;

export const explorerAddress = (address: string) => `https://explorer.solana.com/address/${address}${q}`;
export const explorerTx = (signature: string) => `https://explorer.solana.com/tx/${signature}${q}`;

// A launch costs roughly 0.009 SOL in rent plus fees. Keep a margin.
export const MIN_SOL_TO_LAUNCH = 0.02;

// Set after running `npm run dbc-config`. When present, coins launch on a Meteora bonding curve and can be traded.
// When empty, the app falls back to plain tokens with no trading.
export const DBC_CONFIG: string = (import.meta.env.VITE_DBC_CONFIG || '').trim();
export const CURVE_ON = DBC_CONFIG.length > 0;
// A curve launch needs a little more SOL for the pool accounts.
export const MIN_SOL_TO_LAUNCH_CURVE = 0.05;

// The wallet allowed to claim trading fees (the config's feeClaimer). Only used to show the /#/admin page to the right wallet;
// the chain itself enforces who can claim.
export const FEE_CLAIMER: string = (import.meta.env.VITE_FEE_CLAIMER || '').trim();
