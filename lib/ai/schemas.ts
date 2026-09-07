import { HOOK_TYPES, CLIFFHANGER_TYPES, VISUAL_STYLE, BEATS } from '../microdrama';

/**
 * One schema definition, consumed by every script provider.
 *
 * Shaped for OpenAI strict mode — every object sets `additionalProperties: false`
 * and lists ALL properties in `required`; genuinely optional fields are typed
 * nullable instead of omitted. Anthropic accepts the same shape unchanged, so the
 * two providers can never drift apart.
 */

const hookIds = HOOK_TYPES.map((h) => h.id) as unknown as string[];
const cliffIds = CLIFFHANGER_TYPES.map((c) => c.id) as unknown as string[];
const beatKinds = BEATS.map((b) => b.kind);

export const SPINE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['arcNote_hi', 'episodes'],
  properties: {
    arcNote_hi: { type: 'string', description: 'One Hindi line describing the emotional shape of the whole series.' },
    episodes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['episode', 'title_hi', 'title_en', 'logline_hi', 'hookType', 'cliffhangerType', 'openLoop_hi', 'closesLoop_hi', 'durationSec', 'sourceNote'],
        properties: {
          episode: { type: 'integer' },
          title_hi: { type: 'string', description: 'Hindi title, 2-5 words, written like a thumbnail not a chapter heading.' },
          title_en: { type: 'string' },
          logline_hi: { type: 'string', description: 'One Hindi sentence: what happens and what it costs.' },
          hookType: { type: 'string', enum: hookIds },
          cliffhangerType: { type: 'string', enum: cliffIds },
          openLoop_hi: { type: 'string', description: 'The Hindi question this episode plants and does NOT answer.' },
          closesLoop_hi: { type: 'string', description: "The previous episode's question this one answers in its first 3s. Empty string for episode 1." },
          durationSec: { type: 'number', description: 'Runtime in SECONDS. Must be between 45 and 90.' },
          sourceNote: { type: 'string', description: 'Exact canonical locus this episode dramatises.' },
        },
      },
    },
  },
} as const;

export const EPISODE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['beats', 'shots', 'musicCue', 'publish'],
  properties: {
    beats: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'startSec', 'endSec', 'vo_hi', 'onScreenText_hi', 'direction_hi'],
        properties: {
          kind: { type: 'string', enum: beatKinds },
          startSec: { type: 'number' },
          endSec: { type: 'number' },
          vo_hi: { type: 'string', description: 'Hindi voice-over, sized to the beat at 2.6 words/sec.' },
          onScreenText_hi: { type: 'string', description: 'Burned-in Hindi card, 3-7 words maximum.' },
          direction_hi: { type: 'string', description: 'What the viewer SEES, in Hindi.' },
        },
      },
    },
    shots: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['order', 'startSec', 'endSec', 'beatKind', 'framing', 'imagePrompt', 'motion', 'useVeo', 'veoPrompt'],
        properties: {
          order: { type: 'integer' },
          startSec: { type: 'number' },
          endSec: { type: 'number' },
          beatKind: { type: 'string', enum: beatKinds },
          framing: { type: 'string', enum: [...VISUAL_STYLE.framing] },
          imagePrompt: { type: 'string', description: 'ENGLISH prompt describing a single frame.' },
          motion: { type: 'string', enum: [...VISUAL_STYLE.motion] },
          useVeo: { type: 'boolean' },
          // Nullable rather than optional: strict mode forbids omitting a property.
          veoPrompt: { type: ['string', 'null'], description: 'Motion description when useVeo is true, otherwise null.' },
        },
      },
    },
    musicCue: { type: 'string' },
    publish: {
      type: 'object',
      additionalProperties: false,
      required: ['caption_ig', 'hashtags', 'youtubeTitle', 'youtubeDescription'],
      properties: {
        caption_ig: { type: 'string' },
        hashtags: { type: 'array', items: { type: 'string' } },
        youtubeTitle: { type: 'string' },
        youtubeDescription: { type: 'string' },
      },
    },
  },
} as const;

/** Story -> chapters. The stage above the spine: breaks a named work into chapters. */
export const CHAPTERS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary_hi', 'themes_hi', 'chapters'],
  properties: {
    summary_hi: { type: 'string', description: 'Hindi summary of the whole work, 120-180 words, written like a pitch not an encyclopedia entry.' },
    themes_hi: { type: 'array', items: { type: 'string' }, description: '3-5 Hindi theme phrases.' },
    chapters: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['index', 'title_hi', 'title_en', 'canonicalRef', 'summary_hi', 'keyCharacters', 'suggestedReels', 'ageRating', 'hookSeeds'],
        properties: {
          index: { type: 'integer' },
          title_hi: { type: 'string', description: 'Hindi chapter title, 2-6 words, written like a thumbnail.' },
          title_en: { type: 'string' },
          canonicalRef: { type: 'string', description: 'Exact locus in the cited source, e.g. "सभापर्व, अध्याय 43–65". Never invent a reference.' },
          summary_hi: { type: 'string', description: 'Hindi chapter summary, 90-140 words, told for tension not completeness.' },
          keyCharacters: { type: 'array', items: { type: 'string' }, description: 'Hindi character names.' },
          suggestedReels: { type: 'integer', description: 'How many 60-90s episodes this chapter breaks into. Between 4 and 12.' },
          ageRating: { type: 'string', enum: ['U', 'U/A'] },
          hookSeeds: {
            type: 'array',
            description: '2-3 pre-identified dramatic detonations for this chapter.',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['hookType', 'line_hi'],
              properties: {
                hookType: { type: 'string', enum: hookIds },
                line_hi: { type: 'string', description: 'One Hindi line that would stop a scroll.' },
              },
            },
          },
        },
      },
    },
  },
} as const;
