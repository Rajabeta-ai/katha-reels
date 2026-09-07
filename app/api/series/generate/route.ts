import { NextResponse } from 'next/server';
import { getChapter } from '@/lib/catalog';
import { generateSpine, generateEpisode } from '@/lib/ai/script';
import { runQc } from '@/lib/qc';
import { upsertSeries, seriesForChapter, deleteSeries, id, getSeries } from '@/lib/store';
import { createJob, background, step } from '@/lib/jobs';
import type { Series } from '@/lib/types';

export const maxDuration = 800;

export async function POST(req: Request) {
  const { chapterId, mode = 'adults', count, regenerate } = await req.json();
  const found = getChapter(chapterId);
  if (!found) return NextResponse.json({ error: 'Unknown chapter' }, { status: 404 });

  const existing = seriesForChapter(chapterId);
  if (existing && !regenerate) return NextResponse.json({ seriesId: existing.id, existing: true });
  if (existing) deleteSeries(existing.id);

  const episodes = count || found.chapter.suggestedReels;
  const seriesId = id('ser');
  const shell: Series = {
    id: seriesId,
    chapterId,
    storySlug: found.story.slug,
    mode,
    createdAt: new Date().toISOString(),
    arcNote_hi: '',
    status: 'generating',
    reels: [],
  };
  upsertSeries(shell);

  const job = createJob('series', episodes + 1);
  background(job, async (jobId) => {
    step(jobId, 'Series ka dhaancha ban raha hai…', 0);
    const spine = await generateSpine(found.story, found.chapter, mode, episodes);

    const s0 = getSeries(seriesId)!;
    s0.arcNote_hi = spine.arcNote_hi;
    upsertSeries(s0);
    step(jobId, `Dhaancha taiyaar — ${spine.episodes.length} episodes`, 1);

    for (let i = 0; i < spine.episodes.length; i++) {
      const ep = spine.episodes[i];
      step(jobId, `Episode ${ep.episode}: ${ep.title_hi}`, i + 1);
      const reel = await generateEpisode({
        story: found.story,
        chapter: found.chapter,
        mode,
        arcNote: spine.arcNote_hi,
        spine: spine.episodes,
        target: ep.episode,
        seriesId,
      });
      reel.qc = runQc(reel);
      const cur = getSeries(seriesId)!;
      cur.reels.push(reel);
      cur.reels.sort((a, b) => a.episode - b.episode);
      upsertSeries(cur);
    }

    const done = getSeries(seriesId)!;
    done.status = 'ready';
    upsertSeries(done);
    return { seriesId };
  });

  return NextResponse.json({ seriesId, jobId: job.id });
}
