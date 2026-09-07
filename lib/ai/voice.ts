import fs from 'node:fs';
import path from 'node:path';
import { ASSET_DIR } from '../store';
import type { Reel } from '../types';
import { prepareForTts } from './pronunciation';

/**
 * Default narrators. Both are Hindi-native voices — English voices reading Hindi
 * through the multilingual model carry an English accent on Hindi phonemes,
 * which is immediately audible and wrong for katha.
 */
export const VOICES = {
  adults: { id: 'zgqefOY5FPQ3bB7OZTVR', name: 'Niraj', note: 'male Hindi narrator, deliberate — katha gravitas' },
  kids:   { id: '1qEiC6qsybMkmnNdVMbK', name: 'Monika Sogam', note: 'female Hindi, warm and brighter' },
} as const;

export function voiceFor(mode: 'kids' | 'adults') {
  const override = mode === 'kids' ? process.env.ELEVENLABS_VOICE_ID_KIDS : process.env.ELEVENLABS_VOICE_ID;
  return override || VOICES[mode].id;
}

/**
 * ElevenLabs Hindi narration.
 *
 * The whole reel is one take rather than per-beat clips: a single request keeps
 * prosody continuous across beat boundaries, which is the difference between a
 * narrator and a robot reading a list. Beat gaps are encoded as line breaks,
 * which the multilingual model honours as pauses.
 */
export async function generateVoice(reel: Reel, mode: 'kids' | 'adults' = 'adults'): Promise<{ path: string; durationSec: number }> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('ELEVENLABS_API_KEY is not set — add it to .env.local');
  const voiceId = voiceFor(mode);
  const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_v3';

  // Captions keep canonical spelling; only the spoken copy is rewritten.
  const script = [...reel.beats]
    .sort((a, b) => a.startSec - b.startSec)
    .map((b) => prepareForTts(b.vo_hi.trim()))
    .filter(Boolean)
    .join('\n\n');

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({
      text: script,
      model_id: modelId,
      language_code: 'hi',
      voice_settings: {
        // Low-ish stability + high style keeps the dramatic swing microdrama needs.
        stability: 0.38,
        similarity_boost: 0.8,
        style: 0.55,
        use_speaker_boost: true,
      },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);

  const dir = path.join(ASSET_DIR, reel.id);
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, 'voice.mp3');
  fs.writeFileSync(p, Buffer.from(await res.arrayBuffer()));

  return { path: p, durationSec: await probeDuration(p) };
}

export async function probeDuration(file: string): Promise<number> {
  const { execFile } = await import('node:child_process');
  return new Promise((resolve) => {
    execFile(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file],
      (err, stdout) => resolve(err ? 0 : Math.round(parseFloat(stdout.trim()) * 100) / 100),
    );
  });
}

export async function listVoices() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return [];
  const res = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': key } });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.voices ?? []).map((v: { voice_id: string; name: string; labels?: Record<string, string> }) => ({
    id: v.voice_id,
    name: v.name,
    labels: v.labels ?? {},
  }));
}
