import fs from 'node:fs';
import path from 'node:path';
import { findReel } from '@/lib/store';

/**
 * Serves the finished 9:16 MP4. `?dl=1` forces a download for posting to
 * Instagram/YouTube; without it the feed player streams it with range support.
 */
export async function GET(req: Request, { params }: { params: Promise<{ reelId: string }> }) {
  const { reelId } = await params;
  const found = findReel(reelId);
  const file = found?.reel.render.path;
  if (!file || !fs.existsSync(file)) return new Response('not rendered', { status: 404 });

  const stat = fs.statSync(file);
  const url = new URL(req.url);
  const download = url.searchParams.get('dl') === '1';
  const filename = `${path.basename(file)}`;

  const range = req.headers.get('range');
  const base: Record<string, string> = {
    'content-type': 'video/mp4',
    'accept-ranges': 'bytes',
    'cache-control': 'no-store',
  };
  if (download) base['content-disposition'] = `attachment; filename="${filename}"`;

  // Stream from disk. Reading the whole file per request buffered ~30MB of video
  // into memory for every seek the player made, which was enough to kill the dev
  // server mid-render.
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const start = m?.[1] ? parseInt(m[1], 10) : 0;
    const end = Math.min(m?.[2] ? parseInt(m[2], 10) : stat.size - 1, stat.size - 1);
    if (Number.isNaN(start) || start > end || start >= stat.size) {
      return new Response('range not satisfiable', {
        status: 416,
        headers: { 'content-range': `bytes */${stat.size}` },
      });
    }
    return new Response(nodeToWeb(fs.createReadStream(file, { start, end })), {
      status: 206,
      headers: {
        ...base,
        'content-range': `bytes ${start}-${end}/${stat.size}`,
        'content-length': String(end - start + 1),
      },
    });
  }

  return new Response(nodeToWeb(fs.createReadStream(file)), {
    headers: { ...base, 'content-length': String(stat.size) },
  });
}

/** Node read stream -> web ReadableStream, so Response never buffers the file. */
function nodeToWeb(stream: fs.ReadStream): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      stream.on('data', (c) => controller.enqueue(new Uint8Array(c as Buffer)));
      stream.on('end', () => controller.close());
      stream.on('error', (e) => controller.error(e));
    },
    cancel() {
      stream.destroy();
    },
  });
}
