import { NextResponse } from 'next/server';
import { getSeries, deleteSeries } from '@/lib/store';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = getSeries(id);
  return s ? NextResponse.json(s) : NextResponse.json({ error: 'not found' }, { status: 404 });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteSeries(id);
  return NextResponse.json({ ok: true });
}
