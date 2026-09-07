import { NextResponse } from 'next/server';
import { imageProvider } from '@/lib/ai/images';
import { veoEnabled } from '@/lib/ai/veo';
import { voiceFor, VOICES } from '@/lib/ai/voice';
import { scriptProvider, scriptModel } from '@/lib/ai/script';

/** Powers the setup banner — tells the UI which engines are actually wired up. */
export async function GET() {
  return NextResponse.json({
    scriptProvider: scriptProvider(),
    scriptReady: scriptProvider() === 'azure' ? !!process.env.AZURE_OPENAI_API_KEY : !!process.env.ANTHROPIC_API_KEY,
    model: scriptModel(),
    elevenlabs: !!process.env.ELEVENLABS_API_KEY,
    voices: {
      adults: { id: voiceFor('adults'), name: VOICES.adults.name, note: VOICES.adults.note },
      kids: { id: voiceFor('kids'), name: VOICES.kids.name, note: VOICES.kids.note },
    },
    imageProvider: imageProvider(),
    veo: veoEnabled(),
  });
}
