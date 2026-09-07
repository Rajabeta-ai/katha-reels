import { generateImage, imageProvider } from './ai/images';
import { sheetPath, hasSheet, sheetPrompt, refsForPrompt, castNamesInPrompts } from './ai/characters';
import fs from 'node:fs';
import { generateVeoClip, veoEnabled } from './ai/veo';
import { generateVoice } from './ai/voice';
import { renderReel } from './render';
import { runQc } from './qc';
import { updateReel, findReel } from './store';
import { step } from './jobs';

const CAST_SHEET_PREFIX = 'castgen_';

/**
 * Image APIs drop connections under sustained batch load — a whole shot was being
 * lost to a single transient `fetch failed`. Retry with backoff before giving up.
 */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
  throw last;
}
const sheetSlug = (n: string) => Buffer.from(n).toString('base64url').slice(0, 40);

/** Generate every missing still (and any Veo shots) for one reel. */
export async function buildVisuals(reelId: string, jobId?: string, force = false) {
  const found = findReel(reelId);
  if (!found) throw new Error('Reel not found');
  if (imageProvider() === 'none') throw new Error('IMAGE_PROVIDER is not configured');

  const targets = found.reel.shots.filter((s) => force || s.imageStatus !== 'ready');

  // Which cast members this episode actually shows.
  const names = castNamesInPrompts(targets.map((s) => s.imagePrompt));
  const missing = names.filter((n) => !hasSheet(found.series.id, n));

  if (jobId) step(jobId, 'Visuals ban rahe hain…', 0, targets.length + missing.length + 1);

  // Build the reference sheet FIRST. Every shot of a character is then generated
  // against the same face, which is what stops the cast drifting between shots.
  let sheetsDone = 0;
  for (const name of missing) {
    if (jobId) step(jobId, `Character ban raha: ${name}`, sheetsDone);
    try {
      const tmp = await withRetry(() =>
        generateImage(`${CAST_SHEET_PREFIX}${found.series.id}`, sheetSlug(name), sheetPrompt(name)!),
      );
      fs.copyFileSync(tmp, sheetPath(found.series.id, name));
    } catch {
      // A missing sheet is not fatal — that character just loses consistency.
    }
    sheetsDone++;
  }

  let done = sheetsDone;
  for (const shot of targets) {
    updateReel(reelId, (r) => {
      const s = r.shots.find((x) => x.id === shot.id);
      if (s) { s.imageStatus = 'running'; s.error = undefined; }
    });
    try {
      const p = await withRetry(() =>
        generateImage(reelId, shot.id, shot.imagePrompt, refsForPrompt(found.series.id, shot.imagePrompt)),
      );
      updateReel(reelId, (r) => {
        const s = r.shots.find((x) => x.id === shot.id);
        if (s) { s.imageStatus = 'ready'; s.imagePath = p; }
      });
    } catch (e) {
      updateReel(reelId, (r) => {
        const s = r.shots.find((x) => x.id === shot.id);
        if (s) { s.imageStatus = 'failed'; s.error = e instanceof Error ? e.message : String(e); }
      });
    }
    done++;
    if (jobId) step(jobId, `Shot ${done - sheetsDone}/${targets.length}`, done);
  }

  if (veoEnabled()) {
    const motion = findReel(reelId)!.reel.shots.filter((s) => s.useVeo && s.veoPrompt && (force || s.videoStatus !== 'ready'));
    for (const shot of motion) {
      if (jobId) step(jobId, `Veo motion shot ${shot.order} ban raha…`);
      updateReel(reelId, (r) => {
        const s = r.shots.find((x) => x.id === shot.id);
        if (s) s.videoStatus = 'running';
      });
      try {
        const p = await generateVeoClip(reelId, shot.id, shot.veoPrompt!, shot.imagePath);
        updateReel(reelId, (r) => {
          const s = r.shots.find((x) => x.id === shot.id);
          if (s) { s.videoStatus = 'ready'; s.videoPath = p; }
        });
      } catch (e) {
        updateReel(reelId, (r) => {
          const s = r.shots.find((x) => x.id === shot.id);
          if (s) { s.videoStatus = 'failed'; s.error = e instanceof Error ? e.message : String(e); }
        });
      }
    }
  }

  return findReel(reelId)!.reel;
}

export async function buildVoice(reelId: string, jobId?: string) {
  const found = findReel(reelId);
  if (!found) throw new Error('Reel not found');
  if (jobId) step(jobId, 'Hindi narration ban raha hai…');
  updateReel(reelId, (r) => { r.voice = { status: 'running' }; });
  try {
    // Kids series get the warmer voice; adult katha gets the male narrator.
    const { path, durationSec } = await generateVoice(found.reel, found.series.mode);
    updateReel(reelId, (r) => { r.voice = { status: 'ready', path, durationSec }; });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    updateReel(reelId, (r) => { r.voice = { status: 'failed', error: msg }; });
    throw e;
  }
  return findReel(reelId)!.reel;
}

export async function buildRender(reelId: string, jobId?: string) {
  const found = findReel(reelId);
  if (!found) throw new Error('Reel not found');
  if (jobId) step(jobId, 'Render ho raha hai (ffmpeg)…');
  updateReel(reelId, (r) => { r.render = { status: 'running' }; });
  try {
    const { path, sizeBytes } = await renderReel(findReel(reelId)!.reel);
    updateReel(reelId, (r) => {
      r.render = { status: 'ready', path, sizeBytes, renderedAt: new Date().toISOString() };
      r.qc = runQc(r);
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    updateReel(reelId, (r) => { r.render = { status: 'failed', error: msg }; });
    throw e;
  }
  return findReel(reelId)!.reel;
}

/** Visuals -> narration -> render, in one go. This is the big green button. */
export async function buildAll(reelId: string, jobId?: string) {
  await buildVisuals(reelId, jobId);
  await buildVoice(reelId, jobId);
  await buildRender(reelId, jobId);
  return findReel(reelId)!.reel;
}
