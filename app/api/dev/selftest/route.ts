import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { NextResponse } from 'next/server';
import { ASSET_DIR, upsertSeries, deleteSeries, id, findReel } from '@/lib/store';
import { buildRender } from '@/lib/pipeline';
import { runQc } from '@/lib/qc';
import { FORMAT } from '@/lib/microdrama';
import type { Series, Reel, Shot, Beat } from '@/lib/types';

const run = promisify(execFile);
export const maxDuration = 600;

/**
 * Renders a synthetic reel from solid-colour placeholder frames — no API keys,
 * no credits. Proves ffmpeg, zoompan, concat and Devanagari caption shaping all
 * work on this machine before you spend anything on real generations.
 */
export async function POST() {
  const seriesId = id('ser');
  const reelId = id('reel');
  const dir = path.join(ASSET_DIR, reelId);
  fs.mkdirSync(dir, { recursive: true });

  const palette = ['#3b1d3d', '#7a2d1f', '#1c3f5e', '#4a3210', '#2a1f4d', '#5e1f2d'];
  const shots: Shot[] = [];
  const motions: Shot['motion'][] = ['kenburns-in', 'pan-left', 'kenburns-out', 'tilt-up', 'pan-right', 'kenburns-in'];
  const kinds: Beat['kind'][] = ['hook', 'friction', 'friction', 'escalation', 'spike', 'button'];

  for (let i = 0; i < 6; i++) {
    const shotId = `shot_selftest_${i}`;
    const p = path.join(dir, `${shotId}.png`);
    await run('ffmpeg', [
      '-y', '-f', 'lavfi',
      '-i', `color=c=${palette[i]}:s=${FORMAT.width}x${FORMAT.height}`,
      '-vf', `drawbox=x=0:y=${900 + i * 40}:w=${FORMAT.width}:h=6:color=white@0.5:t=fill`,
      '-frames:v', '1', p,
    ]);
    shots.push({
      id: shotId, order: i + 1, startSec: i * 5, endSec: (i + 1) * 5,
      beatKind: kinds[i], framing: 'close-up',
      imagePrompt: 'self-test placeholder', motion: motions[i], useVeo: false,
      imageStatus: 'ready', imagePath: p,
    });
  }

  const captions = [
    'शास्त्र कहता है — मत उठाओ',
    'गुरु ने आदेश दिया',
    'बारह साल का लड़का',
    'धनुष उठ गया',
    'बाण छूट चुका था',
    'और तभी सब रुक गया',
  ];
  const beats: Beat[] = [
    ['hook', 0, 3], ['friction', 3, 13], ['escalation', 13, 21], ['spike', 21, 27], ['button', 27, 30],
  ].map(([kind, s, e], i) => ({
    id: `beat_selftest_${i}`, kind: kind as Beat['kind'], startSec: s as number, endSec: e as number,
    vo_hi: `यह एक परीक्षण वाक्य है जो ${kind} बीट में बोला जाएगा।`,
    onScreenText_hi: captions[i], direction_hi: 'सेल्फ़-टेस्ट प्लेसहोल्डर फ़्रेम — रंग और कैप्शन की जाँच।',
    shotIds: [],
  }));

  const reel: Reel = {
    id: reelId, seriesId, episode: 1,
    title_hi: 'सेल्फ़ टेस्ट', title_en: 'Self Test',
    logline_hi: 'रेंडर पाइपलाइन की जाँच।',
    hookType: 'dharm-sankat', cliffhangerType: 'astra-uthaa',
    durationSec: 30, openLoop_hi: 'क्या रेंडर काम करेगा?', closesLoop_hi: '',
    beats, shots, musicCue: '—', sourceNote: 'self-test',
    publish: { caption_ig: '—', hashtags: [], youtubeTitle: '—', youtubeDescription: '—' },
    voice: { status: 'pending' }, render: { status: 'pending' }, qc: [],
  };
  reel.qc = runQc(reel);

  const series: Series = {
    id: seriesId, chapterId: '__selftest__', storySlug: '__selftest__', mode: 'adults',
    createdAt: new Date().toISOString(), arcNote_hi: 'self test', status: 'ready', reels: [reel],
  };
  upsertSeries(series);

  try {
    await buildRender(reelId);
    const out = findReel(reelId)!.reel;
    const probe = await run('ffprobe', [
      '-v', 'error', '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height,r_frame_rate,codec_name',
      '-show_entries', 'format=duration,size',
      '-of', 'json', out.render.path!,
    ]);
    return NextResponse.json({
      ok: true, reelId, seriesId,
      render: out.render,
      probe: JSON.parse(probe.stdout),
      note: 'Delete with DELETE /api/series/<seriesId>',
    });
  } catch (e) {
    deleteSeries(seriesId);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
