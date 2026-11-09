export type QuoteInfo = {
  program: 'spl-token' | 'token-2022' | 'other';
  isNativeMint2022?: boolean;
  extensions: string[];
  transferFee?: { zero: boolean; authorityRevoked: boolean } | null;
  mintAuthority?: boolean;
  freezeAuthority?: boolean;
};
export function judgeQuote(info: QuoteInfo): { level: 'ok' | 'badge' | 'no'; reasons: string[]; notes: string[] };
