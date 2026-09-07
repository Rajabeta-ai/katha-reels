import type { HookTypeId } from './microdrama';

export type HookSeed = { hookType: HookTypeId; line_hi: string };

export type Chapter = {
  id: string;
  index: number;
  title_hi: string;
  title_en: string;
  /** Exact locus in the cited source edition. */
  canonicalRef: string;
  summary_hi: string;
  keyCharacters: string[];
  /** How many reels this chapter should break into. */
  suggestedReels: number;
  /** Pre-identified dramatic detonations, used to seed the storyboard engine. */
  hookSeeds: HookSeed[];
  ageRating: 'U' | 'U/A';
  runtimeNote?: string;
};

export type Story = {
  slug: string;
  title_hi: string;
  title_en: string;
  tradition: 'इतिहास' | 'पुराण' | 'नीतिकथा' | 'लोककथा';
  audience: 'kids' | 'adults' | 'both';
  emoji: string;
  gradient: string;
  source: { text_hi: string; edition: string; translator?: string; url: string };
  summary_hi: string;
  themes_hi: string[];
  chapters: Chapter[];
};

/** UI labels for `tradition`. The catalog keeps the Devanagari value as data. */
export const TRADITION_EN: Record<Story['tradition'], string> = {
  'इतिहास': 'Itihasa',
  'पुराण': 'Purana',
  'नीतिकथा': 'Niti-katha',
  'लोककथा': 'Folk tale',
};
