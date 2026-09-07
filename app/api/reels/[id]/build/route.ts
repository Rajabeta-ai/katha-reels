import { NextResponse } from 'next/server';
import { findReel } from '@/lib/store';
import { createJob, background } from '@/lib/jobs';
import { buildAll, buildVisuals, buildVoice, buildRender } from '@/lib/pipeline';

export const maxDuration = 800;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = findReel(id);
  if (!found) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const { stage = 'all', force = false } = await req.json().catch(() => ({}));
  const total = found.reel.shots.length + 2;
  const job = createJob(`build:${stage}`, total);

  background(job, async (jobId) => {
    switch (stage) {
      case 'visuals': return buildVisuals(id, jobId, force);
      case 'voice':   return buildVoice(id, jobId);
      case 'render':  return buildRender(id, jobId);
      default:        return buildAll(id, jobId);
    }
  });

  return NextResponse.json({ jobId: job.id });
}
