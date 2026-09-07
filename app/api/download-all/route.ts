import fs from 'node:fs';
import path from 'node:path';
import archiver from 'archiver';
import { listSeries } from '@/lib/store';
import { getChapter } from '@/lib/catalog';

export const maxDuration = 800;

/**
 * Streams every rendered reel as one ZIP.
 *
 * Stored, not deflated — MP4s are already compressed, so compressing again costs
 * CPU and saves nothing. Files are foldered by story/chapter so a 300-reel
 * download is still navigable, and each series carries a captions.txt with the
 * Instagram and YouTube copy for posting.
 *
 * `?series=<id>` limits it to one chapter.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const only = url.searchParams.get('series');

  const all = listSeries().filter((s) => !only || s.id === only);
  const ready = all.flatMap((s) =>
    s.reels.filter((r) => r.render.status === 'ready' && r.render.path && fs.existsSync(r.render.path))
      .map((r) => ({ series: s, reel: r })),
  );
  if (!ready.length) return new Response('No rendered reels yet', { status: 404 });

  const archive = archiver('zip', { zlib: { level: 0 } });
  const safe = (s: string) => s.replace(/[^\p{L}\p{N} _-]/gu, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'x';

  for (const { series, reel } of ready) {
    const ctx = getChapter(series.chapterId);
    const folder = `${safe(ctx?.story.title_en ?? series.storySlug)}/${String(ctx?.chapter.index ?? 0).padStart(2, '0')}-${safe(ctx?.chapter.title_en ?? series.chapterId)}`;
    archive.file(reel.render.path!, { name: `${folder}/EP${String(reel.episode).padStart(2, '0')}-${safe(reel.title_en)}.mp4` });

    const caption =
      `EP ${reel.episode} — ${reel.title_hi}\n${reel.logline_hi}\n\n` +
      `— INSTAGRAM —\n${reel.publish.caption_ig}\n\n${reel.publish.hashtags.join(' ')}\n\n` +
      `— YOUTUBE —\n${reel.publish.youtubeTitle}\n\n${reel.publish.youtubeDescription}\n\n` +
      `Source: ${reel.sourceNote}\n`;
    archive.append(caption, { name: `${folder}/EP${String(reel.episode).padStart(2, '0')}-caption.txt` });
  }

  archive.finalize();

  const stamp = new Date().toISOString().slice(0, 10);
  const name = only ? `katha-reels-${safe(only)}-${stamp}.zip` : `katha-reels-all-${stamp}.zip`;

  return new Response(archive as unknown as ReadableStream, {
    headers: {
      'content-type': 'application/zip',
      'content-disposition': `attachment; filename="${name}"`,
      'cache-control': 'no-store',
    },
  });
}
