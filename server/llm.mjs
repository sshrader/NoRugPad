// Talks to any OpenAI-compatible chat API. Groq, Cerebras, OpenRouter, Together, a local
// Ollama or llama.cpp server, and Gemini's compatibility endpoint all work. The key stays on
// the server. It is never sent to the browser.
//
// Settings are read when called (not at import) so .env changes apply after a restart and
// tests can point the client at a fake server.

const cfg = () => ({
  base: (process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, ''),
  key: process.env.LLM_API_KEY || '',
  model: process.env.LLM_MODEL || 'openai/gpt-oss-20b',
  timeoutMs: Number(process.env.LLM_TIMEOUT_MS || 20000),
});

export const llmEnabled = () => Boolean(cfg().key);

export function llmInfo() {
  const c = cfg();
  return { enabled: Boolean(c.key), model: c.model, host: new URL(c.base).host };
}

export async function complete({ system, messages, maxTokens = 140, temperature = 0.9 }) {
  const c = cfg();
  const body = {
    model: c.model,
    messages: [{ role: 'system', content: system }, ...messages],
    max_tokens: maxTokens,
    temperature,
  };
  // gpt-oss models think before answering, and that thinking counts toward max_tokens. Ask for
  // little of it and leave room, otherwise a short reply can come back empty.
  if (/gpt-oss/i.test(c.model)) {
    body.reasoning_effort = process.env.LLM_REASONING_EFFORT || 'low';
    body.max_tokens = Math.max(maxTokens, 500);
  }
  const r = await fetch(`${c.base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${c.key}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(c.timeoutMs),
  });
  if (!r.ok) throw new Error(`LLM request failed (${r.status}): ${(await r.text()).slice(0, 200)}`);
  const json = await r.json();
  return String(json?.choices?.[0]?.message?.content ?? '').trim();
}
