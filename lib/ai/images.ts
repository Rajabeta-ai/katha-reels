import fs from 'node:fs';
import path from 'node:path';
import { ASSET_DIR } from '../store';
import { VISUAL_STYLE, FORMAT } from '../microdrama';

export type ImageProvider = 'gemini' | 'openai' | 'fal' | 'none';

export function imageProvider(): ImageProvider {
  return (process.env.IMAGE_PROVIDER as ImageProvider) || 'none';
}

type Rendered = { bytes: Buffer; ext: 'png' | 'jpg' };

/**
 * One prompt, one vertical still on disk. Returns the absolute path.
 *
 * Source images are generated well above 1080x1920 on purpose — the Ken Burns
 * move in the renderer zooms *into* the frame, so a 768px source would visibly
 * soften. Gemini at 2K gives 1536x2752.
 */
export async function generateImage(
  reelId: string,
  shotId: string,
  prompt: string,
  /** Character reference portraits to hold likeness across shots. */
  refs: string[] = [],
): Promise<string> {
  const provider = imageProvider();
  let out: Rendered;

  switch (provider) {
    case 'gemini':
      out = await gemini(prompt, refs);
      break;
    case 'openai':
      out = await openai(`${prompt}\n\nAvoid: ${VISUAL_STYLE.negative}`);
      break;
    case 'fal':
      out = await fal(`${prompt}\n\nNegative: ${VISUAL_STYLE.negative}`);
      break;
    default:
      throw new Error('IMAGE_PROVIDER is not configured. Set it to gemini | openai | fal in .env.local');
  }

  const dir = path.join(ASSET_DIR, reelId);
  fs.mkdirSync(dir, { recursive: true });
  // Drop any stale file for this shot in the other format, so a regenerate that
  // switches provider can't leave two images behind and serve the wrong one.
  for (const e of ['png', 'jpg']) {
    const stale = path.join(dir, `${shotId}.${e}`);
    if (e !== out.ext && fs.existsSync(stale)) fs.unlinkSync(stale);
  }

  const p = path.join(dir, `${shotId}.${out.ext}`);
  fs.writeFileSync(p, out.bytes);
  return p;
}

/**
 * Gemini native image models ("Nano Banana"). Note these use `generateContent`
 * with an IMAGE response modality — NOT Imagen's `:predict` + `instances` shape.
 * They also have no negative-prompt parameter, so exclusions are folded into the
 * prompt text as instructions.
 */
async function gemini(prompt: string, refs: string[] = []): Promise<Rendered> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');
  const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image';
  const size = process.env.GEMINI_IMAGE_SIZE || '2K';

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            // Reference portraits go BEFORE the instruction so the model reads
            // them as the subject's established likeness, not as style hints.
            ...refs
              .filter((r) => fs.existsSync(r))
              .map((r) => ({
                inlineData: {
                  mimeType: r.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg',
                  data: fs.readFileSync(r).toString('base64'),
                },
              })),
            {
              text:
                (refs.length
                  ? 'REFERENCE IMAGES: use these ONLY for the facial likeness, age, hair, beard and costume ' +
                    'of the named character. Keep the same face and the same ornaments.\n' +
                    'Do NOT copy the reference framing, camera angle, crop, pose, background, lighting, ' +
                    'or any border or frame around it. Composition must follow the SCENE below exactly — ' +
                    'treat the reference as a casting photo of the actor, not as a layout to imitate.\n\n'
                  : '') +
                `${prompt}\n\nRender none of the following: ${VISUAL_STYLE.negative}.`,
            },
          ],
        }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: { aspectRatio: '9:16', imageSize: size },
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini image ${res.status}: ${(await res.text()).slice(0, 300)}`);

  const json = await res.json();
  const cand = json?.candidates?.[0];
  const part = cand?.content?.parts?.find((p: { inlineData?: { data?: string } }) => p?.inlineData?.data);
  if (!part) {
    // A blocked prompt comes back as a finishReason rather than an HTTP error.
    const why = cand?.finishReason || json?.promptFeedback?.blockReason || 'no image in response';
    throw new Error(`Gemini image returned no image (${why})`);
  }
  return {
    bytes: Buffer.from(part.inlineData.data, 'base64'),
    ext: String(part.inlineData.mimeType).includes('png') ? 'png' : 'jpg',
  };
}

async function openai(prompt: string): Promise<Rendered> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not set');
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
      prompt,
      size: '1024x1536',
      n: 1,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI images ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI returned no image');
  return { bytes: Buffer.from(b64, 'base64'), ext: 'png' };
}

async function fal(prompt: string): Promise<Rendered> {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error('FAL_KEY is not set');
  const model = process.env.FAL_IMAGE_MODEL || 'fal-ai/flux-pro/v1.1-ultra';
  const res = await fetch(`https://fal.run/${model}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Key ${key}` },
    body: JSON.stringify({ prompt, aspect_ratio: '9:16', num_images: 1, output_format: 'png' }),
  });
  if (!res.ok) throw new Error(`fal ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const url = json?.images?.[0]?.url;
  if (!url) throw new Error('fal returned no image');
  const img = await fetch(url);
  return { bytes: Buffer.from(await img.arrayBuffer()), ext: 'png' };
}

export const TARGET_SIZE = { w: FORMAT.width, h: FORMAT.height };
