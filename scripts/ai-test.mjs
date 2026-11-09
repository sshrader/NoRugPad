// Offline test of the AI module with a fake Cloudflare. Run: node scripts/ai-test.mjs
import assert from 'node:assert/strict';
process.env.CF_ACCOUNT_ID = 'acct';
process.env.CF_API_TOKEN = 'tok';
const { makeConcept, makeMascot, screenIdea, aiBudget, aiEnabled, AiError } = await import('../server/ai.mjs');

assert.equal(aiEnabled(), true);
process.env.IMAGE_PROVIDER = 'somethingelse';
assert.equal(aiEnabled(), false);
process.env.IMAGE_PROVIDER = 'cloudflare';
assert.equal(aiEnabled(), true);
const reply = (obj, ok = true, status = 200) => async () => ({ ok, status, json: async () => obj });

// concept: parses JSON out of chatty text, cleans fields
const c = await makeConcept('a sleepy cat who codes', reply({ success: true, result: { response: 'Sure!\n{"name":"Sleepy Coder","symbol":"zzz","description":"A cat. Codes. Naps.","mascot":"orange cat in a hoodie, yawning"}' } }));
assert.deepEqual(c, { name: 'Sleepy Coder', symbol: 'ZZZ', description: 'A cat. Codes. Naps.', mascot: 'orange cat in a hoodie, yawning' });

// the idea is screened before anything is sent
let called = false;
const spy = async () => { called = true; return { ok: true, json: async () => ({}) }; };
for (const bad of ['trump coin', 'a pikachu meme', 'nsfw frog', 'hi']) {
  await assert.rejects(() => makeConcept(bad, spy), AiError);
}
assert.equal(called, false);
assert.throws(() => screenIdea('x'.repeat(301)), AiError);

// model slips: output is screened too
await assert.rejects(() => makeConcept('a happy frog', reply({ success: true, result: { response: '{"name":"Mario Frog","symbol":"MF","description":"x","mascot":"frog"}' } })), AiError);
// garbage reply
await assert.rejects(() => makeConcept('a happy frog', reply({ success: true, result: { response: 'no json here' } })), /make sense/);
// service failure does not leak details
await assert.rejects(() => makeConcept('a happy frog', reply({ success: false, errors: [{ message: 'secret internals' }] }, false, 500)), (e) => e instanceof AiError && !/secret/.test(e.message));

// mascot: type is sniffed from the data, not trusted
const jpeg = '/9j/' + 'A'.repeat(100);
assert.deepEqual(await makeMascot('orange cat in a hoodie', reply({ success: true, result: { image: jpeg } })), { mime: 'image/jpeg', image: jpeg });
await assert.rejects(() => makeMascot('orange cat', reply({ success: true, result: { image: 'PHN2Zz4=' } })), /format/);
await assert.rejects(() => makeMascot('orange cat', reply({ success: true, result: {} })), /no image/);

// budget: per-wallet hourly limit
for (let i = 0; i < 10; i++) aiBudget('image', '1.1.1.1', 'W');
assert.throws(() => aiBudget('image', '1.1.1.1', 'W'), /lot of generations/);
console.log('ai-test: ok');
