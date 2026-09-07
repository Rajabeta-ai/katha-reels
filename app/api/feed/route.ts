import { NextResponse } from 'next/server';
import { listSeries } from '@/lib/store';
import { getChapter } from '@/lib/catalog';

/** Every rendered reel, ordered for binge: chapter by chapter, episode by episode. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const only = url.searchParams.get('series');

  const items = listSeries()
    .filter((s) => !only || s.id === only)
    .flatMap((s) => {
      const ctx = getChapter(s.chapterId);
      return [...s.reels]
        .sort((a, b) => a.episode - b.episode)
        .filter((r) => r.render.status === 'ready')
        .map((r) => ({
          id: r.id,
          seriesId: s.id,
          episode: r.episode,
          title_hi: r.title_hi,
          logline_hi: r.logline_hi,
          openLoop_hi: r.openLoop_hi,
          durationSec: r.durationSec,
          hookType: r.hookType,
          cliffhangerType: r.cliffhangerType,
          storyTitle_hi: ctx?.story.title_hi ?? '',
          chapterTitle_hi: ctx?.chapter.title_hi ?? '',
          chapterId: s.chapterId,
          caption_ig: r.publish.caption_ig,
          hashtags: r.publish.hashtags,
          src: `/api/download/${r.id}`,
        }));
    });

  return NextResponse.json({ items });
}
