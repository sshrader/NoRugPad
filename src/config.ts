import { clusterApiUrl } from '@solana/web3.js';

export type Cluster = 'devnet' | 'testnet';

export const CLUSTER: Cluster = import.meta.env.VITE_CLUSTER === 'testnet' ? 'testnet' : 'devnet';
export const RPC_URL: string = import.meta.env.VITE_RPC_URL || clusterApiUrl(CLUSTER);

export const explorerAddress = (address: string) => `https://explorer.solana.com/address/${address}?cluster=${CLUSTER}`;
export const explorerTx = (signature: string) => `https://explorer.solana.com/tx/${signature}?cluster=${CLUSTER}`;

// A launch costs roughly 0.009 SOL in rent plus fees. Keep a margin.
export const MIN_SOL_TO_LAUNCH = 0.02;
