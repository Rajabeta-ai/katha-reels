import fs from 'node:fs';
import path from 'node:path';
import { ASSET_DIR } from '../store';

/**
 * Veo motion shots. Used sparingly — the script engine flags at most two shots
 * per episode, because a Veo clip costs orders of magnitude more than a still
 * and the format's energy comes from cutting, not from camera moves.
 */
export function veoEnabled() {
  return process.env.VEO_ENABLED === 'true' && !!process.env.GEMINI_API_KEY;
}

export async function generateVeoClip(reelId: string, shotId: string, prompt: string, seedImage?: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');
  const model = process.env.VEO_MODEL || 'veo-3.1-generate-preview';

  const instance: Record<string, unknown> = { prompt };
  if (seedImage && fs.existsSync(seedImage)) {
    // Image-to-video keeps the Veo shot on-model with the stills around it.
    // The still may be JPEG (Gemini) or PNG (OpenAI/fal) — declare what it is.
    instance.image = {
      bytesBase64Encoded: fs.readFileSync(seedImage).toString('base64'),
      mimeType: seedImage.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg',
    };
  }

  // `personGeneration` is rejected outright by this endpoint ("allow_adult ...
  // not supported"), so it is omitted. `resolution` is opt-in: Veo returns
  // 720x1280 by default, which the renderer upscales to 1080x1920.
  const parameters: Record<string, unknown> = { aspectRatio: '9:16', durationSeconds: 8 };
  if (process.env.VEO_RESOLUTION) parameters.resolution = process.env.VEO_RESOLUTION;

  const start = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:predictLongRunning?key=${key}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ instances: [instance], parameters }),
    },
  );
  if (!start.ok) throw new Error(`Veo start ${start.status}: ${(await start.text()).slice(0, 300)}`);
  const op = await start.json();

  // Poll the long-running operation. Veo typically lands in 1-3 minutes.
  const deadline = Date.now() + 8 * 60_000;
  let done: Record<string, unknown> | null = null;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 10_000));
    const poll = await fetch(`https://generativelanguage.googleapis.com/v1beta/${op.name}?key=${key}`);
    const j = await poll.json();
    if (j.done) {
      if (j.error) throw new Error(`Veo failed: ${j.error.message}`);
      done = j;
      break;
    }
  }
  if (!done) throw new Error('Veo timed out after 8 minutes');

  const resp = (done as { response?: Record<string, unknown> }).response ?? {};
  const gen = (resp.generateVideoResponse as { generatedSamples?: { video?: { uri?: string } }[] } | undefined)?.generatedSamples?.[0]
    ?? (resp as { generatedSamples?: { video?: { uri?: string } }[] }).generatedSamples?.[0];
  const uri = gen?.video?.uri;
  if (!uri) throw new Error('Veo returned no video URI');

  const dl = await fetch(uri.includes('key=') ? uri : `${uri}${uri.includes('?') ? '&' : '?'}key=${key}`);
  if (!dl.ok) throw new Error(`Veo download ${dl.status}`);

  const dir = path.join(ASSET_DIR, reelId);
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, `${shotId}.mp4`);
  fs.writeFileSync(p, Buffer.from(await dl.arrayBuffer()));
  return p;
}
