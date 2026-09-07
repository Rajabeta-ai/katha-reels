import { NextResponse } from 'next/server';
import { listVoices } from '@/lib/ai/voice';

/**
 * Lists the ElevenLabs voices on the account so you can pick a Hindi narrator
 * for ELEVENLABS_VOICE_ID. Hindi-capable voices are surfaced first.
 */
export async function GET() {
  if (!process.env.ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: 'ELEVENLABS_API_KEY is not set in .env.local' }, { status: 400 });
  }

  const voices = await listVoices();
  const hindiish = (v: { name: string; labels: Record<string, string> }) => {
    const blob = `${v.name} ${Object.values(v.labels).join(' ')}`.toLowerCase();
    return /hindi|indian|india|urdu/.test(blob);
  };

  return NextResponse.json({
    count: voices.length,
    current: process.env.ELEVENLABS_VOICE_ID || '1qEiC6qsybMkmnNdVMbK',
    hint: 'Copy an id into ELEVENLABS_VOICE_ID in .env.local, then restart the dev server.',
    likelyHindi: voices.filter(hindiish),
    all: voices.filter((v: { name: string; labels: Record<string, string> }) => !hindiish(v)),
  });
}
