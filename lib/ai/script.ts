import { SYSTEM, CHAPTERS_SYSTEM, seriesPrompt, episodePrompt, chaptersPrompt } from './prompts';
import { SPINE_SCHEMA, EPISODE_SCHEMA, CHAPTERS_SCHEMA } from './schemas';
import { anthropicJson } from './anthropic';
import { azureJson } from './azure';
import type { Story, Chapter } from '../catalog-types';
import type { Reel, Beat, Shot } from '../types';
import { id } from '../store';

export type ScriptProvider = 'anthropic' | 'azure';

export function scriptProvider(): ScriptProvider {
  const p = (process.env.SCRIPT_PROVIDER || '').toLowerCase();
  if (p === 'azure' || p === 'anthropic') return p;
  // Fall back to whichever is actually configured.
  return process.env.AZURE_OPENAI_API_KEY ? 'azure' : 'anthropic';
}

export function scriptModel() {
  return scriptProvider() === 'azure'
    ? process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5.4-nano'
    : process.env.KATHA_SCRIPT_MODEL || 'claude-opus-5';
}

const maxTokens = (fallback: number) => Number(process.env.SCRIPT_MAX_TOKENS) || fallback;

function callJson<T>(system: string, prompt: string, schema: object, name: string, tokens: number): Promise<T> {
  return scriptProvider() === 'azure'
    ? azureJson<T>(system, prompt, schema, name, tokens)
    : anthropicJson<T>(system, prompt, schema, name, tokens);
}

export type StoryBrief = {
  title_hi: string; title_en: string; tradition: string; audience: string;
  sourceText_hi: string; sourceEdition: string; sourceUrl?: string;
  notes?: string; chapterCount?: number; emoji?: string; gradient?: string;
};

export type GeneratedChapters = {
  summary_hi: string;
  themes_hi: string[];
  chapters: {
    index: number; title_hi: string; title_en: string; canonicalRef: string;
    summary_hi: string; keyCharacters: string[]; suggestedReels: number;
    ageRating: 'U' | 'U/A'; hookSeeds: { hookType: string; line_hi: string }[];
  }[];
};

/** Breaks a user-supplied work into chapters, the stage above the series spine. */
export async function generateChapters(brief: StoryBrief) {
  return callJson<GeneratedChapters>(
    CHAPTERS_SYSTEM, chaptersPrompt(brief), CHAPTERS_SCHEMA, 'story_chapters', 9000,
  );
}

export type Spine = {
  episode: number;
  title_hi: string;
  title_en: string;
  logline_hi: string;
  hookType: string;
  cliffhangerType: string;
  openLoop_hi: string;
  closesLoop_hi: string;
  durationSec: number;
  sourceNote: string;
};

export async function generateSpine(story: Story, chapter: Chapter, mode: 'kids' | 'adults', count: number) {
  return callJson<{ arcNote_hi: string; episodes: Spine[] }>(
    SYSTEM, seriesPrompt(story, chapter, mode, count), SPINE_SCHEMA, 'series_beat_sheet', maxTokens(8000),
  );
}

export async function generateEpisode(args: {
  story: Story; chapter: Chapter; mode: 'kids' | 'adults';
  arcNote: string; spine: Spine[]; target: number; seriesId: string;
  styleNote?: string;
}): Promise<Reel> {
  const out = await callJson<{
    beats: Omit<Beat, 'id' | 'shotIds'>[];
    shots: (Omit<Shot, 'id' | 'imageStatus' | 'order'> & { order?: number; veoPrompt?: string | null })[];
    musicCue: string;
    publish: Reel['publish'];
  }>(SYSTEM, episodePrompt(args), EPISODE_SCHEMA, 'episode_script', maxTokens(16000));

  const me = args.spine.find((s) => s.episode === args.target)!;

  const shots: Shot[] = out.shots
    .sort((a, b) => a.startSec - b.startSec)
    .map((s, i) => ({
      id: id('shot'),
      order: i + 1,
      startSec: round(s.startSec),
      endSec: round(s.endSec),
      beatKind: s.beatKind,
      framing: s.framing,
      imagePrompt: s.imagePrompt,
      motion: s.motion,
      useVeo: !!s.useVeo,
      // Strict schemas send null rather than omitting the field.
      veoPrompt: s.veoPrompt ?? undefined,
      imageStatus: 'pending',
      videoStatus: s.useVeo ? 'pending' : undefined,
    }));

  const beats: Beat[] = dedupeBeats(out.beats)
    .map((b) => ({
      id: id('beat'),
      kind: b.kind,
      startSec: round(b.startSec),
      endSec: round(b.endSec),
      vo_hi: b.vo_hi,
      onScreenText_hi: b.onScreenText_hi,
      direction_hi: b.direction_hi,
      shotIds: shots.filter((s) => s.startSec >= b.startSec - 0.01 && s.startSec < b.endSec - 0.01).map((s) => s.id),
    }));

  return {
    id: id('reel'),
    seriesId: args.seriesId,
    episode: me.episode,
    title_hi: me.title_hi,
    title_en: me.title_en,
    logline_hi: me.logline_hi,
    hookType: me.hookType as Reel['hookType'],
    cliffhangerType: me.cliffhangerType as Reel['cliffhangerType'],
    durationSec: round(Math.max(...shots.map((s) => s.endSec), me.durationSec)),
    openLoop_hi: me.openLoop_hi,
    closesLoop_hi: me.closesLoop_hi,
    beats,
    shots,
    musicCue: out.musicCue,
    sourceNote: me.sourceNote,
    publish: out.publish,
    voice: { status: 'pending' },
    render: { status: 'pending' },
    qc: [],
  };
}

/**
 * Weaker models sometimes emit a beat kind twice. Keep the earliest of each kind
 * in time order — a duplicate would otherwise double-render its caption and skew
 * every downstream timing calculation.
 */
function dedupeBeats(beats: Omit<Beat, 'id' | 'shotIds'>[]) {
  const seen = new Set<string>();
  return [...beats]
    .sort((a, b) => a.startSec - b.startSec)
    .filter((b) => (seen.has(b.kind) ? false : (seen.add(b.kind), true)));
}

const round = (n: number) => Math.round(n * 100) / 100;
