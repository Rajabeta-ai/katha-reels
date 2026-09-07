import { NextResponse } from 'next/server';
import { getChapter } from '@/lib/catalog';
import { generateEpisode, type Spine } from '@/lib/ai/script';
import { runQc } from '@/lib/qc';
import { getSeries, upsertSeries } from '@/lib/store';
import { createJob, background, step } from '@/lib/jobs';

export const maxDuration = 800;

/**
 * Generates ONE additional episode into an existing series, rather than
 * regenerating the whole chapter. The spine handed to the writer is rebuilt from
 * the episodes already on disk, so continuity (the open/close loop chain) is
 * preserved without re-deriving what has already been produced.
 *
 * `spineEntry` supplies the target episode's plan; `styleNote` carries any
 * continuity directive (narrator voice, tone) the existing episodes established.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const series = getSeries(id);
  if (!series) return NextResponse.json({ error: 'Series not found' }, { status: 404 });

  const ctx = getChapter(series.chapterId);
  if (!ctx) return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });

  const { spineEntry, styleNote } = (await req.json()) as { spineEntry: Spine; styleNote?: string };
  if (!spineEntry?.episode) return NextResponse.json({ error: 'spineEntry with an episode number is required' }, { status: 400 });

  const target = spineEntry.episode;
  if (series.reels.some((r) => r.episode === target)) {
    return NextResponse.json({ error: `Episode ${target} already exists in this series` }, { status: 409 });
  }

  // Rebuild the spine from what is already produced, then splice in the target.
  const existing: Spine[] = series.reels.map((r) => ({
    episode: r.episode,
    title_hi: r.title_hi,
    title_en: r.title_en,
    logline_hi: r.logline_hi,
    hookType: r.hookType,
    cliffhangerType: r.cliffhangerType,
    openLoop_hi: r.openLoop_hi,
    closesLoop_hi: r.closesLoop_hi,
    durationSec: r.durationSec,
    sourceNote: r.sourceNote,
  }));
  const spine = [...existing, spineEntry].sort((a, b) => a.episode - b.episode);

  const job = createJob(`episode:${target}`, 1);
  background(job, async (jobId) => {
    step(jobId, `Episode ${target} likha ja raha hai…`, 0, 1);
    const reel = await generateEpisode({
      story: ctx.story,
      chapter: ctx.chapter,
      mode: series.mode,
      arcNote: series.arcNote_hi,
      spine,
      target,
      seriesId: series.id,
      styleNote,
    });
    reel.qc = runQc(reel);

    const cur = getSeries(series.id)!;
    cur.reels.push(reel);
    cur.reels.sort((a, b) => a.episode - b.episode);
    upsertSeries(cur);
    return { reelId: reel.id, episode: reel.episode, qc: reel.qc.filter((q) => !q.pass) };
  });

  return NextResponse.json({ jobId: job.id, seriesId: series.id, episode: target });
}
