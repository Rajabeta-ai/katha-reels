import { NextResponse } from 'next/server';
import { getChapter } from '@/lib/catalog';
import { runQc } from '@/lib/qc';
import { upsertSeries, seriesForChapter, deleteSeries, getSeries, id } from '@/lib/store';
import type { Series, Reel, Beat, Shot } from '@/lib/types';

export const maxDuration = 300;

type InBeat = Omit<Beat, 'id' | 'shotIds'>;
type InShot = Omit<Shot, 'id' | 'imageStatus' | 'order'> & { order?: number };
type InEpisode = Omit<Reel, 'id' | 'seriesId' | 'beats' | 'shots' | 'voice' | 'render' | 'qc'> & {
  beats: InBeat[];
  shots: InShot[];
};

/**
 * Loads hand-authored (or externally generated) episode scripts into the store
 * in exactly the shape lib/ai/script.ts would have produced — same ids, same
 * beat/shot linking, same QC pass. Lets the visual + audio pipeline run when the
 * script engine is unavailable.
 *
 * Pass `append: true` to add episodes to an existing series for this chapter.
 */
export async function POST(req: Request) {
  const body = await req.json();
  const { chapterId, mode = 'adults', arcNote_hi = '', episodes, append = false } = body as {
    chapterId: string; mode: 'kids' | 'adults'; arcNote_hi: string; episodes: InEpisode[]; append?: boolean;
  };

  const found = getChapter(chapterId);
  if (!found) return NextResponse.json({ error: `Unknown chapter: ${chapterId}` }, { status: 404 });
  if (!Array.isArray(episodes) || !episodes.length) {
    return NextResponse.json({ error: 'episodes[] is required' }, { status: 400 });
  }

  const existing = seriesForChapter(chapterId);
  let series: Series;
  if (existing && append) {
    series = getSeries(existing.id)!;
    if (arcNote_hi) series.arcNote_hi = arcNote_hi;
  } else {
    if (existing) deleteSeries(existing.id);
    series = {
      id: id('ser'), chapterId, storySlug: found.story.slug, mode,
      createdAt: new Date().toISOString(), arcNote_hi, status: 'ready', reels: [],
    };
  }

  const report: { episode: number; blockers: string[]; warns: string[] }[] = [];

  for (const ep of episodes) {
    const shots: Shot[] = [...ep.shots]
      .sort((a, b) => a.startSec - b.startSec)
      .map((s, i) => ({ ...s, id: id('shot'), order: i + 1, imageStatus: 'pending' as const,
                        videoStatus: s.useVeo ? ('pending' as const) : undefined }));

    const beats: Beat[] = [...ep.beats]
      .sort((a, b) => a.startSec - b.startSec)
      .map((b) => ({
        ...b, id: id('beat'),
        shotIds: shots.filter((s) => s.startSec >= b.startSec - 0.01 && s.startSec < b.endSec - 0.01).map((s) => s.id),
      }));

    const reel: Reel = {
      ...ep, id: id('reel'), seriesId: series.id, beats, shots,
      voice: { status: 'pending' }, render: { status: 'pending' }, qc: [],
    };
    reel.qc = runQc(reel);

    series.reels = series.reels.filter((r) => r.episode !== reel.episode);
    series.reels.push(reel);
    report.push({
      episode: reel.episode,
      blockers: reel.qc.filter((q) => !q.pass && q.severity === 'blocker').map((q) => `${q.id}: ${q.note}`),
      warns: reel.qc.filter((q) => !q.pass && q.severity === 'warn').map((q) => `${q.id}: ${q.note}`),
    });
  }

  series.reels.sort((a, b) => a.episode - b.episode);
  upsertSeries(series);

  return NextResponse.json({
    ok: true, seriesId: series.id, episodes: series.reels.length,
    reels: series.reels.map((r) => ({ episode: r.episode, id: r.id, title: r.title_hi, shots: r.shots.length })),
    qc: report,
  });
}
