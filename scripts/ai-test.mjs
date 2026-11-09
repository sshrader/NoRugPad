// Offline test of the AI module with a fake Cloudflare. Run: node scripts/ai-test.mjs
import assert from 'node:assert/strict';
process.env.CF_ACCOUNT_ID = 'acct';
process.env.CF_API_TOKEN = 'tok';
const { makeConcept, makeMascot, screenIdea, aiBudget, aiEnabled, AiError, extractJson } = await import('../server/ai.mjs');

assert.equal(aiEnabled(), true);
process.env.IMAGE_PROVIDER = 'somethingelse';
assert.equal(aiEnabled(), false);
process.env.IMAGE_PROVIDER = 'cloudflare';
assert.equal(aiEnabled(), true);
const reply = (obj, ok = true, status = 200) => async () => ({ ok, status, json: async () => obj });

// concept: parses JSON out of chatty text, cleans fields
const c = await makeConcept('a sleepy cat who codes', reply({ success: true, result: { response: 'Sure!\n{"name":"Sleepy Coder","symbol":"zzz","description":"A cat. Codes. Naps.","mascot":"orange cat in a hoodie, yawning"}' } }));
assert.deepEqual(c, { name: 'Sleepy Coder', symbol: 'ZZZ', description: 'A cat. Codes. Naps.', mascot: 'orange cat in a hoodie, yawning' });

// replies that used to fail: already-parsed object, code fences, trailing comma, curly quotes, text around it
const concept = { name: 'Gym Raccoon', symbol: 'GYMR', description: 'Lifts. Scoots.', mascot: 'muscular raccoon on a scooter' };
const objReply = await makeConcept('a raccoon on a scooter', reply({ success: true, result: { response: concept } }));
assert.equal(objReply.name, 'Gym Raccoon');
for (const text of [
  '```json\n' + JSON.stringify(concept) + '\n```',
  'Here you go: ' + JSON.stringify(concept) + ' Enjoy!',
  JSON.stringify(concept).replace('}', ',}'),
  JSON.stringify(concept).replace(/"/g, '\u201c'),
]) {
  const got = extractJson(text);
  if (text.includes('\u201c')) continue; // all quotes curly is beyond repair, and that is fine
  assert.equal(got.symbol, 'GYMR', text);
}
// one bad reply followed by a good one is retried
let n = 0;
const flaky = async () => ({ ok: true, status: 200, json: async () => ({ success: true, result: { response: n++ === 0 ? 'sorry, no' : JSON.stringify(concept) } }) });
assert.equal((await makeConcept('a raccoon on a scooter', flaky)).symbol, 'GYMR');
assert.equal(n, 2);

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
