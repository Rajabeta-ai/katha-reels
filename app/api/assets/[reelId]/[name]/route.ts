import fs from 'node:fs';
import path from 'node:path';
import { ASSET_DIR } from '@/lib/store';

const TYPES: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4' };

export async function GET(_: Request, { params }: { params: Promise<{ reelId: string; name: string }> }) {
  const { reelId, name } = await params;
  // Both segments are single path components — reject anything that could escape ASSET_DIR.
  if (!/^[\w.-]+$/.test(reelId) || !/^[\w.-]+$/.test(name)) return new Response('bad path', { status: 400 });

  const file = path.join(ASSET_DIR, reelId, name);
  if (!file.startsWith(ASSET_DIR) || !fs.existsSync(file)) return new Response('not found', { status: 404 });

  const buf = fs.readFileSync(file);
  return new Response(new Uint8Array(buf), {
    headers: {
      'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store',
    },
  });
}
