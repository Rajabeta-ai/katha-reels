import { NextResponse } from 'next/server';
import { findReel, updateReel } from '@/lib/store';
import { generateImage } from '@/lib/ai/images';
import { refsForPrompt } from '@/lib/ai/characters';

export const maxDuration = 300;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { shotId, imagePrompt } = await req.json();
  const found = findReel(id);
  const shot = found?.reel.shots.find((s) => s.id === shotId);
  if (!found || !shot) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const prompt = imagePrompt || shot.imagePrompt;
  updateReel(id, (r) => {
    const s = r.shots.find((x) => x.id === shotId)!;
    s.imageStatus = 'running';
    s.imagePrompt = prompt;
    s.error = undefined;
  });

  try {
    // Same cast sheets the batch pipeline uses, so a retried shot stays on-model.
    const p = await generateImage(id, shotId, prompt, refsForPrompt(found.series.id, prompt));
    const r = updateReel(id, (reel) => {
      const s = reel.shots.find((x) => x.id === shotId)!;
      s.imageStatus = 'ready';
      s.imagePath = p;
    });
    return NextResponse.json(r);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    updateReel(id, (reel) => {
      const s = reel.shots.find((x) => x.id === shotId)!;
      s.imageStatus = 'failed';
      s.error = msg;
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
