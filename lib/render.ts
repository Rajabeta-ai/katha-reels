import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { RENDER_DIR, ASSET_DIR } from './store';
import { FORMAT } from './microdrama';
import type { Reel, Shot } from './types';

const run = promisify(execFile);

/**
 * Assembles stills (+ any Veo clips) into a 1080x1920 H.264 reel with Hindi
 * narration and burned-in Devanagari captions.
 *
 * Captions go through libass rather than drawtext: drawtext has no complex-text
 * shaping, so Devanagari conjuncts and matras come out broken. libass shapes via
 * harfbuzz and renders Hindi correctly.
 */

/**
 * Caption font. macOS ships Kohinoor Devanagari; Linux containers ship nothing
 * with Devanagari coverage, so a bundled Noto Sans Devanagari travels with the
 * repo and `fontsdir` points libass at it. Override both via env if you want a
 * different face.
 */
const FONT = process.env.CAPTION_FONT || 'Noto Sans Devanagari';
const FONTS_DIR = process.env.CAPTION_FONTS_DIR || path.join(process.cwd(), 'assets', 'fonts');
const SCRIM_H = 660;

export async function renderReel(reel: Reel): Promise<{ path: string; sizeBytes: number }> {
  const shots = [...reel.shots].sort((a, b) => a.startSec - b.startSec);
  const usable = shots.filter((s) => s.imagePath && fs.existsSync(s.imagePath));
  if (!usable.length) throw new Error('No shot images on disk — generate visuals first');

  const work = path.join(ASSET_DIR, reel.id, 'work');
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(work, { recursive: true });

  // If narration exists, it is the clock: stretch the visual timeline to match so
  // the last word and the last frame land together.
  const voice = reel.voice.status === 'ready' && reel.voice.path && fs.existsSync(reel.voice.path) ? reel.voice.path : null;
  const voiceDur = voice ? reel.voice.durationSec || 0 : 0;
  const raw = Math.max(...shots.map((s) => s.endSec));
  const factor = voiceDur > 1 ? clamp(voiceDur / raw, 0.7, 1.5) : 1;

  // 1. One silent segment per shot.
  const segments: string[] = [];
  for (const shot of usable) {
    const dur = Math.max(0.6, (shot.endSec - shot.startSec) * factor);
    const out = path.join(work, `seg_${String(shot.order).padStart(3, '0')}.mp4`);
    if (shot.videoPath && fs.existsSync(shot.videoPath)) {
      await veoSegment(shot.videoPath, out, dur);
    } else {
      await stillSegment(shot.imagePath!, out, dur, shot.motion);
    }
    segments.push(out);
  }

  // 2. Concat.
  const listFile = path.join(work, 'segments.txt');
  fs.writeFileSync(listFile, segments.map((s) => `file '${s.replace(/'/g, "'\\''")}'`).join('\n'));
  const silent = path.join(work, 'silent.mp4');
  await run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', silent], { maxBuffer: 1 << 26 });

  // 3. Captions.
  const ass = path.join(work, 'captions.ass');
  fs.writeFileSync(ass, buildAss(reel, factor), 'utf8');

  // 4. Bottom scrim. A soft alpha ramp, not a drawbox — a hard-edged box reads as
  //    a black bar sitting on the picture, which is exactly what a polished reel
  //    does not look like.
  const scrim = path.join(work, 'scrim.png');
  await run('ffmpeg', [
    '-y', '-f', 'lavfi', '-i', `color=black:s=8x${SCRIM_H}`,
    '-vf', `format=rgba,geq=r=0:g=0:b=0:a='255*pow(Y/H,0.9)*0.74'`,
    '-frames:v', '1', scrim,
  ], { maxBuffer: 1 << 24 });

  // 5. Mux: scrim, burned captions, narration.
  fs.mkdirSync(RENDER_DIR, { recursive: true });
  const out = path.join(RENDER_DIR, `${slug(reel)}.mp4`);

  const args = ['-y', '-i', silent, '-i', scrim];
  if (voice) args.push('-i', voice);
  args.push(
    '-filter_complex',
    `[1:v]scale=${FORMAT.width}:${SCRIM_H}[sc];` +
      `[0:v][sc]overlay=0:H-${SCRIM_H}:format=auto[bg];` +
      `[bg]subtitles=${escapeFilterPath(ass)}:fontsdir=${escapeFilterPath(FONTS_DIR)},format=yuv420p[v]`,
    '-map', '[v]',
  );
  if (voice) args.push('-map', '2:a');
  args.push(
    '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.1',
    '-preset', 'medium', '-crf', '20',
    '-r', String(FORMAT.fps),
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
  );
  if (voice) args.push('-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-ac', '2', '-shortest');
  else args.push('-an');
  args.push(out);

  await run('ffmpeg', args, { maxBuffer: 1 << 26 });
  fs.rmSync(work, { recursive: true, force: true });

  return { path: out, sizeBytes: fs.statSync(out).size };
}

/** Ken Burns over a still. Upscaled first so zoompan has real pixels to work with. */
async function stillSegment(image: string, out: string, dur: number, motion: Shot['motion']) {
  const frames = Math.max(2, Math.round(dur * FORMAT.fps));
  const zEnd = 1.18;
  const step = (zEnd - 1) / frames;

  // zoompan x/y are evaluated per output frame; `on` is the output frame index.
  let z = `min(1+${step.toFixed(6)}*on,${zEnd})`;
  let x = `iw/2-(iw/zoom/2)`;
  let y = `ih/2-(ih/zoom/2)`;

  switch (motion) {
    case 'kenburns-out':
      z = `max(${zEnd}-${step.toFixed(6)}*on,1)`;
      break;
    case 'pan-left':
      z = String(zEnd);
      x = `(iw-iw/zoom)*(1-on/${frames})`;
      break;
    case 'pan-right':
      z = String(zEnd);
      x = `(iw-iw/zoom)*(on/${frames})`;
      break;
    case 'tilt-up':
      z = String(zEnd);
      y = `(ih-ih/zoom)*(1-on/${frames})`;
      break;
    case 'tilt-down':
      z = String(zEnd);
      y = `(ih-ih/zoom)*(on/${frames})`;
      break;
    case 'static':
      z = '1';
      break;
  }

  const filter =
    `scale=${FORMAT.width * 2}:${FORMAT.height * 2}:force_original_aspect_ratio=increase,` +
    `crop=${FORMAT.width * 2}:${FORMAT.height * 2},` +
    `zoompan=z='${z}':x='${x}':y='${y}':d=${frames}:s=${FORMAT.width}x${FORMAT.height}:fps=${FORMAT.fps},` +
    `setsar=1`;

  await run('ffmpeg', [
    '-y', '-loop', '1', '-i', image, '-t', dur.toFixed(3),
    '-vf', filter,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FORMAT.fps),
    '-an', out,
  ], { maxBuffer: 1 << 26 });
}

/** Fit a Veo clip to its slot: cover-crop to 9:16 and trim/loop to the shot duration. */
async function veoSegment(video: string, out: string, dur: number) {
  await run('ffmpeg', [
    '-y', '-stream_loop', '-1', '-i', video, '-t', dur.toFixed(3),
    '-vf', `scale=${FORMAT.width}:${FORMAT.height}:force_original_aspect_ratio=increase,crop=${FORMAT.width}:${FORMAT.height},setsar=1,fps=${FORMAT.fps}`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-an', out,
  ], { maxBuffer: 1 << 26 });
}

function buildAss(reel: Reel, factor: number) {
  const head = `[Script Info]
ScriptType: v4.00+
PlayResX: ${FORMAT.width}
PlayResY: ${FORMAT.height}
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Katha,${FONT},76,&H00FFFFFF,&H000000FF,&H00101820,&H96000000,-1,0,0,0,100,100,1,0,1,4,3,2,90,90,${FORMAT.safeBottomPx + 30},1
Style: Hook,${FONT},92,&H0038E4FF,&H000000FF,&H00101820,&H96000000,-1,0,0,0,100,100,1,0,1,5,3,2,80,80,${FORMAT.safeBottomPx + 30},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, Effect, Text
`;

  const lines = [...reel.beats]
    .sort((a, b) => a.startSec - b.startSec)
    .filter((b) => b.onScreenText_hi?.trim())
    .map((b) => {
      const start = ts(b.startSec * factor);
      const end = ts(b.endSec * factor);
      const style = b.kind === 'hook' || b.kind === 'button' ? 'Hook' : 'Katha';
      const text = b.onScreenText_hi.trim().replace(/\r?\n/g, '\\N').replace(/[{}]/g, '');
      // 200ms fade in/out keeps cards from strobing between beats.
      return `Dialogue: 0,${start},${end},${style},,0,0,,{\\fad(200,200)}${text}`;
    });

  return head + lines.join('\n') + '\n';
}

function ts(sec: number) {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${rest.toFixed(2).padStart(5, '0')}`;
}

/** ffmpeg filter args need : and \ and ' escaped inside a path. */
function escapeFilterPath(p: string) {
  return p.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

function slug(reel: Reel) {
  const t = reel.title_en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'reel';
  return `ep${String(reel.episode).padStart(2, '0')}-${t}-${reel.id}`;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
