// GMGN takes the token (mint) address. Axiom and Padre take the pool (pair) address, so those use the coin's pool when it has one.
// Trading terminals a creator can jump to right after launch. The URLs are the usual token-page patterns for each site;
// if one of them changes, edit it here. New coins can take a minute or two to show up on a terminal.
export const PLATFORMS = [
  { id: 'site', label: 'NoRugPad coin page', url: null as null | ((mint: string, pool?: string) => string) },
  { id: 'gmgn', label: 'GMGN', url: (m: string) => `https://gmgn.ai/sol/token/${m}` },
  { id: 'axiom', label: 'Axiom', url: (m: string, pool?: string) => `https://axiom.trade/meme/${pool || m}` },
  { id: 'padre', label: 'Terminal (Padre)', url: (m: string, pool?: string) => `https://trade.padre.gg/trade/solana/${pool || m}` },
] as const;

export type PlatformId = (typeof PLATFORMS)[number]['id'];

export const platformUrl = (id: string, mint: string, pool?: string): string | null => PLATFORMS.find((p) => p.id === id)?.url?.(mint, pool) ?? null;
