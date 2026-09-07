import https from 'node:https';
import { SPINE_SCHEMA, EPISODE_SCHEMA } from './schemas';

/**
 * Posts JSON over node:https rather than global fetch.
 *
 * Node's fetch caps response headers at 300s, and a full episode script from a
 * reasoning model routinely runs longer — it fails as a bare "fetch failed" with
 * no HTTP status, which is impossible to diagnose from the job log. The undici
 * package would also fix it but collides with Node's built-in webidl under
 * Turbopack, so this uses the core module and sets the ceiling explicitly.
 */
function postJson(
  url: string,
  headers: Record<string, string>,
  payload: string,
  timeoutMs: number,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        path: `${u.pathname}${u.search}`,
        method: 'POST',
        headers: { ...headers, 'content-length': Buffer.byteLength(payload) },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }));
      },
    );
    req.on('timeout', () => req.destroy(new Error(`no response within ${Math.round(timeoutMs / 1000)}s`)));
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

const REQUEST_TIMEOUT_MS = Number(process.env.AZURE_TIMEOUT_MS) || 15 * 60_000;

/**
 * Azure OpenAI / AI Foundry script provider.
 *
 * Speaks either of Azure's two surfaces, selected by AZURE_OPENAI_API_STYLE:
 *   responses  — /openai/v1/responses, structured output via `text.format`
 *   chat       — /openai/v1/chat/completions, via `response_format`
 * The Responses API is the default: it is where the newer models (gpt-6-astra)
 * are served and it exposes reasoning tokens.
 */

type Style = 'responses' | 'chat';

function config() {
  const raw = process.env.AZURE_OPENAI_ENDPOINT;
  const key = process.env.AZURE_OPENAI_API_KEY;
  if (!raw || !key) throw new Error('AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY must be set in .env.local');

  // Accept a bare host, a full project URL, or a full inference URL — reduce all
  // of them to the resource origin the API actually lives on.
  const origin = new URL(raw).origin;
  const style: Style = (process.env.AZURE_OPENAI_API_STYLE as Style) || 'responses';
  const version = process.env.AZURE_OPENAI_API_VERSION || 'preview';
  const path = style === 'responses' ? '/openai/v1/responses' : '/openai/v1/chat/completions';

  return {
    url: `${origin}${path}?api-version=${version}`,
    key,
    style,
    model: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-6-astra',
  };
}

export async function azureJson<T>(system: string, prompt: string, schema: object, name: string, maxTokens: number): Promise<T> {
  const { url, key, style, model } = config();

  const body = style === 'responses'
    ? {
        model,
        input: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        text: { format: { type: 'json_schema', name, strict: true, schema } },
        max_output_tokens: maxTokens,
      }
    : {
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_schema', json_schema: { name, strict: true, schema } },
        max_completion_tokens: maxTokens,
      };

  let res;
  try {
    res = await postJson(url, { 'api-key': key, 'content-type': 'application/json' }, JSON.stringify(body), REQUEST_TIMEOUT_MS);
  } catch (e) {
    throw new Error(`Azure OpenAI request failed before a response arrived: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Azure OpenAI ${res.status} (${style}): ${res.body.slice(0, 400)}`);
  }

  const json = JSON.parse(res.body) as Record<string, unknown>;
  const content = style === 'responses' ? readResponses(json, maxTokens) : readChat(json, maxTokens);

  try {
    return JSON.parse(content) as T;
  } catch {
    throw new Error(`Azure OpenAI returned non-JSON content: ${content.slice(0, 200)}`);
  }
}

function readResponses(json: Record<string, unknown>, maxTokens: number): string {
  const status = json.status as string | undefined;
  if (status === 'incomplete') {
    const reason = (json.incomplete_details as { reason?: string } | undefined)?.reason;
    throw new Error(
      reason === 'max_output_tokens'
        ? `Azure hit the output ceiling before finishing the JSON (max_output_tokens=${maxTokens}). Raise SCRIPT_MAX_TOKENS.`
        : `Azure returned an incomplete response (${reason ?? 'unknown'})`,
    );
  }
  if (json.error) throw new Error(`Azure error: ${JSON.stringify(json.error).slice(0, 300)}`);

  // Prefer the flattened convenience field; fall back to walking the output items,
  // which also skips past any reasoning items the model emits first.
  const flat = json.output_text;
  if (typeof flat === 'string' && flat.trim()) return flat;

  const output = (json.output ?? []) as { type?: string; content?: { type?: string; text?: string }[] }[];
  for (const item of output) {
    if (item.type !== 'message') continue;
    for (const c of item.content ?? []) {
      if (c.type === 'output_text' && c.text) return c.text;
    }
  }
  const refusal = output.find((i) => i.content?.some((c) => c.type === 'refusal'));
  if (refusal) throw new Error('Azure refused the request — soften the battlefield wording in the chapter prompt.');
  throw new Error('Azure Responses API returned no output text');
}

function readChat(json: Record<string, unknown>, maxTokens: number): string {
  const choice = (json.choices as { finish_reason?: string; message?: { content?: string } }[] | undefined)?.[0];
  if (!choice) throw new Error('Azure OpenAI returned no choices');
  if (choice.finish_reason === 'length') {
    throw new Error(`Azure hit the token ceiling before finishing the JSON (max_completion_tokens=${maxTokens}). Raise SCRIPT_MAX_TOKENS.`);
  }
  if (choice.finish_reason === 'content_filter') {
    throw new Error('Azure content filter blocked the response — soften the battlefield wording in the chapter prompt.');
  }
  const content = choice.message?.content;
  if (!content) throw new Error('Azure OpenAI returned an empty message');
  return content;
}

export const AZURE_SPINE_SCHEMA = SPINE_SCHEMA;
export const AZURE_EPISODE_SCHEMA = EPISODE_SCHEMA;
