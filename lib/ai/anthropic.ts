import Anthropic from '@anthropic-ai/sdk';

/**
 * Anthropic script provider. Raw JSON only — the shared post-processing that
 * turns this into a Reel lives in script.ts, so both providers stay identical.
 *
 * Structured output is forced tool use: the model must emit exactly the schema.
 */
function client() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set — add it to .env.local');
  return new Anthropic({ apiKey: key });
}

export async function anthropicJson<T>(system: string, prompt: string, schema: object, name: string, maxTokens: number): Promise<T> {
  const res = await client().messages.create({
    model: process.env.KATHA_SCRIPT_MODEL || 'claude-opus-5',
    max_tokens: maxTokens,
    system,
    tools: [{ name, description: `Structured output: ${name}`, input_schema: schema as Anthropic.Tool.InputSchema }],
    tool_choice: { type: 'tool', name },
    messages: [{ role: 'user', content: prompt }],
  });

  const block = res.content.find((c) => c.type === 'tool_use');
  if (!block || block.type !== 'tool_use') throw new Error('Anthropic returned no structured output');
  return block.input as T;
}
