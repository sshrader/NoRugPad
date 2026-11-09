// Checks the quote-token rules. Run: node scripts/quote-test.mjs
import assert from 'node:assert/strict';
import { judgeQuote } from './quote-rules.mjs';

assert.equal(judgeQuote({ program: 'spl-token', extensions: [] }).level, 'ok');
assert.equal(judgeQuote({ program: 'other', extensions: [] }).level, 'no');
assert.equal(judgeQuote({ program: 'token-2022', isNativeMint2022: true, extensions: [] }).level, 'no');
assert.equal(judgeQuote({ program: 'token-2022', extensions: [] }).level, 'ok');
assert.equal(judgeQuote({ program: 'token-2022', extensions: ['MetadataPointer', 'TokenMetadata'] }).level, 'ok');
assert.equal(judgeQuote({ program: 'token-2022', extensions: ['TransferFeeConfig'], transferFee: { zero: true, authorityRevoked: true } }).level, 'ok');
assert.equal(judgeQuote({ program: 'token-2022', extensions: ['TransferFeeConfig'], transferFee: { zero: true, authorityRevoked: false } }).level, 'badge');
assert.equal(judgeQuote({ program: 'token-2022', extensions: ['TransferFeeConfig'], transferFee: { zero: false, authorityRevoked: true } }).level, 'badge');
assert.equal(judgeQuote({ program: 'token-2022', extensions: ['MetadataPointer', 'PermanentDelegate', 'Pausable'] }).level, 'badge');
assert.equal(judgeQuote({ program: 'token-2022', extensions: ['TransferHook'] }).level, 'badge');
assert.equal(judgeQuote({ program: 'token-2022', extensions: ['NonTransferable'] }).level, 'no');
const r = judgeQuote({ program: 'spl-token', extensions: [], freezeAuthority: true, mintAuthority: true });
assert.equal(r.level, 'ok');
assert.equal(r.notes.length, 2, 'freeze and mint authority are noted');
console.log('quote-test: ok');
