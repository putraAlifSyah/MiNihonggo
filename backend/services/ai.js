/**
 * Universal AI caller — OpenAI-compatible API.
 * Supports: OpenAI, Google Gemini, Anthropic (via OpenAI-compat), OpenRouter, Ollama.
 * All API keys are decrypted from DB before use.
 */

const db = require('../db');
const { decrypt } = require('./encryption');

/**
 * Get and decrypt a user's AI settings from DB.
 * @param {string} userId
 * @returns {{ is_enabled, provider, base_url, api_key, model_name } | null}
 */
function getAISettings(userId) {
  const row = db.prepare('SELECT * FROM ai_settings WHERE user_id = ?').get(userId);
  if (!row || !row.is_enabled) return null;

  let api_key = '';
  try {
    api_key = row.api_key ? decrypt(row.api_key) : '';
  } catch {
    api_key = '';
  }

  return { ...row, api_key };
}

/**
 * Make a non-streaming AI call and return the full text response.
 * @param {string} userId
 * @param {Array<{role, content}>} messages
 * @param {string} systemPrompt
 * @returns {Promise<string>} - AI response text
 */
async function callAI(userId, messages, systemPrompt) {
  const settings = getAISettings(userId);
  if (!settings) throw new Error('AI_DISABLED');

  return callAIRaw(settings, messages, systemPrompt, false);
}

/**
 * Stream an AI response directly into an Express SSE response.
 * Call res.end() afterwards.
 * @param {string} userId
 * @param {Array<{role, content}>} messages
 * @param {string} systemPrompt
 * @param {import('express').Response} res - Express response (already set to SSE headers)
 */
async function streamAI(userId, messages, systemPrompt, res) {
  const settings = getAISettings(userId);
  if (!settings) {
    res.write(`data: ${JSON.stringify({ error: 'AI_DISABLED' })}\n\n`);
    res.end();
    return;
  }

  const url = `${settings.base_url.replace(/\/$/, '')}/chat/completions`;

  const body = JSON.stringify({
    model: settings.model_name,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    stream: true,
  });

  let fetchResponse;
  try {
    fetchResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.api_key}`,
      },
      body,
    });
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
    return;
  }

  if (!fetchResponse.ok) {
    const errText = await fetchResponse.text();
    res.write(`data: ${JSON.stringify({ error: errText })}\n\n`);
    res.end();
    return;
  }

  // Pipe SSE chunks to client
  const reader = fetchResponse.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep incomplete line

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') {
        res.write('data: [DONE]\n\n');
        continue;
      }
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          res.write(`data: ${JSON.stringify({ token: delta })}\n\n`);
        }
      } catch {
        // ignore malformed chunks
      }
    }
  }

  res.write('data: [DONE]\n\n');
  res.end();
}

/**
 * Raw AI call (used for test-connection — no userId needed).
 * @param {{ base_url, api_key, model_name }} settings
 * @param {Array<{role, content}>} messages
 * @param {string} systemPrompt
 * @param {boolean} stream
 * @returns {Promise<string>}
 */
async function callAIRaw(settings, messages, systemPrompt, stream = false) {
  const url = `${settings.base_url.replace(/\/$/, '')}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.api_key}`,
    },
    body: JSON.stringify({
      model: settings.model_name,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      stream: false,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

module.exports = { getAISettings, callAI, streamAI, callAIRaw };
