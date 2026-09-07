import type { BeatKind, HookTypeId, CliffhangerTypeId, MotionId } from './microdrama';

export type AssetStatus = 'pending' | 'running' | 'ready' | 'failed';

export type Shot = {
  id: string;
  order: number;
  startSec: number;
  endSec: number;
  beatKind: BeatKind;
  framing: string;
  /** English prompt handed to the image model. */
  imagePrompt: string;
  motion: MotionId;
  /** Flagged by the script engine for the 1-2 shots that most deserve real motion. */
  useVeo: boolean;
  veoPrompt?: string;
  imageStatus: AssetStatus;
  imagePath?: string;
  videoStatus?: AssetStatus;
  videoPath?: string;
  error?: string;
};

export type Beat = {
  id: string;
  kind: BeatKind;
  startSec: number;
  endSec: number;
  /** Hindi voice-over for this beat. */
  vo_hi: string;
  /** Burned-in Hindi text card. Kept short — this is the muted-viewer's story. */
  onScreenText_hi: string;
  /** Director's note: what the audience SEES. */
  direction_hi: string;
  shotIds: string[];
};

export type QcResult = { id: string; pass: boolean; severity: 'blocker' | 'warn'; label: string; note: string };

export type Reel = {
  id: string;
  seriesId: string;
  episode: number;
  title_hi: string;
  title_en: string;
  logline_hi: string;
  hookType: HookTypeId;
  cliffhangerType: CliffhangerTypeId;
  durationSec: number;
  /** The question this reel plants and does NOT answer. */
  openLoop_hi: string;
  /** The previous reel's question that this reel's Hook pays off. */
  closesLoop_hi: string;
  beats: Beat[];
  shots: Shot[];
  musicCue: string;
  sourceNote: string;
  publish: {
    caption_ig: string;
    hashtags: string[];
    youtubeTitle: string;
    youtubeDescription: string;
  };
  voice: { status: AssetStatus; path?: string; durationSec?: number; error?: string };
  render: { status: AssetStatus; path?: string; sizeBytes?: number; renderedAt?: string; error?: string };
  qc: QcResult[];
};

export type Series = {
  id: string;
  chapterId: string;
  storySlug: string;
  mode: 'kids' | 'adults';
  createdAt: string;
  arcNote_hi: string;
  status: 'generating' | 'draft' | 'ready' | 'failed';
  error?: string;
  reels: Reel[];
};

export type Db = {
  series: Series[];
  /** Stories added through the UI. Shape-compatible with the built-in catalogue. */
  customStories?: import('./catalog-types').Story[];
};
