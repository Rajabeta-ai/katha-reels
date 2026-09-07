import fs from 'node:fs';
import { NextResponse } from 'next/server';
import { generateVeoClip, veoEnabled } from '@/lib/ai/veo';
import { id } from '@/lib/store';

export const maxDuration = 800;

/**
 * Generates ONE Veo clip through the real provider code, so the Veo path is
 * proven before a full chapter fires ~18 of them.
 */
export async function POST(req: Request) {
  if (!veoEnabled()) {
    return NextResponse.json({ error: 'VEO_ENABLED is not true, or GEMINI_API_KEY is missing' }, { status: 400 });
  }
  const { prompt } = await req.json().catch(() => ({ prompt: '' }));
  const reelId = id('veotest');
  const t0 = Date.now();
  try {
    const p = await generateVeoClip(reelId, 'shot_veo_probe', prompt || 'Slow push in on a lone teenage warrior in ancient Indian armour standing inside a spiral formation of soldiers, dust drifting, cinematic painterly style.');
    return NextResponse.json({
      ok: true, path: p,
      sizeBytes: fs.statSync(p).size,
      elapsedSec: Math.round((Date.now() - t0) / 1000),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e), elapsedSec: Math.round((Date.now() - t0) / 1000) },
      { status: 500 },
    );
  }
}
