// Meteora Dynamic Bonding Curve's rules for a quote token (the token a coin is priced and traded in), as published at
// https://docs.meteora.ag/core-products/dbc/token-2022-support . Pure logic so it can be tested without a network.
// Re-check that page before relying on this: Meteora can change the rules.

const OK_EXTENSIONS = new Set(['MetadataPointer', 'TokenMetadata']);

// What each extension means for a bonding curve that would hold this token in its vault.
const EXTENSION_NOTES = {
  TransferHook: 'A transfer hook runs the issuer\'s own program on every transfer. Meteora\'s doc does not say how it treats these, so ask them before relying on it.',
  PermanentDelegate: 'The issuer can move or burn tokens from ANY account, including the curve vault and your fee wallets.',
  Pausable: 'The issuer can pause all transfers, which would freeze trading and fee claims.',
  DefaultAccountState: 'New token accounts may start frozen, so buyers or the vault could be unable to use them until the issuer thaws them.',
  ScaledUiAmount: 'Wallets show a scaled balance, not the raw amount, so prices and amounts on the page would need converting.',
  NonTransferable: 'Tokens cannot be moved, so it cannot work as a quote token.',
  ConfidentialTransferMint: 'Confidential transfers hide amounts, which the curve cannot use.',
  InterestBearingConfig: 'The displayed balance grows over time while the raw amount stays fixed, so amounts shown would need converting.',
  MintCloseAuthority: 'The issuer can close the mint if its supply is zero.',
  TransferFeeConfig: 'The token can charge a fee on every transfer.',
};

/**
 * info: {
 *   program: 'spl-token' | 'token-2022' | 'other',
 *   isNativeMint2022?: boolean,
 *   extensions: string[],                 // mint extension names (Token-2022 only)
 *   transferFee?: { zero: boolean, authorityRevoked: boolean } | null,
 *   mintAuthority?: boolean, freezeAuthority?: boolean
 * }
 * Returns { level: 'ok' | 'badge' | 'no', reasons: string[], notes: string[] }
 *   ok    = Meteora allows it with no approval
 *   badge = needs a per-token approval from a Meteora operator (a TokenBadge)
 *   no    = cannot be used
 */
export function judgeQuote(info) {
  const reasons = [];
  const notes = [];
  let level = 'ok';
  const raise = (to) => {
    const order = { ok: 0, badge: 1, no: 2 };
    if (order[to] > order[level]) level = to;
  };

  if (info.program === 'other') {
    return { level: 'no', reasons: ['The mint is not owned by the SPL Token or Token-2022 program.'], notes };
  }
  if (info.isNativeMint2022) {
    return { level: 'no', reasons: ['This is the Token-2022 native mint, which Meteora rejects. Use wrapped SOL instead.'], notes };
  }

  if (info.program === 'spl-token') {
    reasons.push('A standard SPL Token: Meteora allows these with no approval.');
  } else {
    const exts = info.extensions || [];
    if (exts.length === 0) {
      reasons.push('A Token-2022 mint with no extensions: Meteora allows it with no approval.');
    }
    for (const e of exts) {
      if (OK_EXTENSIONS.has(e)) {
        reasons.push(`${e}: allowed with no approval.`);
      } else if (e === 'TransferFeeConfig') {
        const tf = info.transferFee;
        if (tf && tf.zero && tf.authorityRevoked) {
          reasons.push('TransferFeeConfig with a zero fee and a revoked authority: allowed with no approval.');
        } else {
          raise('badge');
          reasons.push(`TransferFeeConfig is ${tf ? (tf.zero ? 'zero-fee but its authority can still change it' : 'a non-zero fee') : 'present (details not read)'}: needs a Meteora approval.`);
          notes.push('Even with an approval, a non-zero transfer fee is rejected by the older create_config instruction. A newer create_config2 is needed.');
        }
      } else {
        raise('badge');
        reasons.push(`${e}: not on Meteora's no-approval list, so it needs a Meteora approval.`);
      }
      if (EXTENSION_NOTES[e] && !OK_EXTENSIONS.has(e)) notes.push(`${e}: ${EXTENSION_NOTES[e]}`);
      if (e === 'NonTransferable') raise('no');
    }
  }

  if (info.freezeAuthority) notes.push('A freeze authority is set: the issuer can freeze any token account that holds this token, including the curve vault and your fee wallets.');
  if (info.mintAuthority) notes.push('A mint authority is set: the issuer can create more of this token (normal for a token backed by shares, but it means the supply can change).');
  return { level, reasons, notes };
}
