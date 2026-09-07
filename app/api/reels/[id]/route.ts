import { NextResponse } from 'next/server';
import { findReel, updateReel } from '@/lib/store';
import { runQc } from '@/lib/qc';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = findReel(id);
  return f ? NextResponse.json(f.reel) : NextResponse.json({ error: 'not found' }, { status: 404 });
}

/** Hand-edit any beat's Hindi VO or caption, then re-run QC. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patch = await req.json();
  const r = updateReel(id, (reel) => {
    if (patch.beats) {
      for (const b of patch.beats) {
        const target = reel.beats.find((x) => x.id === b.id);
        if (!target) continue;
        if (typeof b.vo_hi === 'string') target.vo_hi = b.vo_hi;
        if (typeof b.onScreenText_hi === 'string') target.onScreenText_hi = b.onScreenText_hi;
      }
    }
    if (patch.shots) {
      for (const s of patch.shots) {
        const target = reel.shots.find((x) => x.id === s.id);
        if (!target) continue;
        if (typeof s.imagePrompt === 'string') target.imagePrompt = s.imagePrompt;
        if (typeof s.motion === 'string') target.motion = s.motion;
      }
    }
    reel.qc = runQc(reel);
  });
  return r ? NextResponse.json(r) : NextResponse.json({ error: 'not found' }, { status: 404 });
}
