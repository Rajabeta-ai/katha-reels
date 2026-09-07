import { NextResponse } from 'next/server';
import { getJob } from '@/lib/jobs';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const j = getJob(id);
  return j ? NextResponse.json(j) : NextResponse.json({ error: 'not found' }, { status: 404 });
}
