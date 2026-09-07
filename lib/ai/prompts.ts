import { BEATS, HOOK_TYPES, CLIFFHANGER_TYPES, FORMAT, VISUAL_STYLE, REVERENCE_RULES, SERIES_ARC } from '../microdrama';
import type { Story, Chapter } from '../catalog-types';

const hookList = HOOK_TYPES.map((h) => `  - ${h.id} (${h.hi} / ${h.en}, duanju ${h.duanju}) e.g. ${h.example}`).join('\n');
const cliffList = CLIFFHANGER_TYPES.map((c) => `  - ${c.id} — ${c.hi} / ${c.en}`).join('\n');
const beatList = BEATS.map(
  (b) => `  - ${b.kind} (${b.label_hi} / ${b.label_en}) ~${Math.round(b.share[0] * 100)}%-${Math.round(b.share[1] * 100)}% of runtime. RULE: ${b.rule}`,
).join('\n');
const arcList = SERIES_ARC.map((a) => `  - from ${Math.round(a.at * 100)}% of the way in: ${a.phase} — ${a.note}`).join('\n');

export const SYSTEM = `You are the head writer of a Hindi vertical microdrama studio that adapts Hindu scripture into 9:16 reels for Instagram and YouTube Shorts.

You write in the Chinese duanju (短剧) tradition — the format that made vertical microdrama an $11B category — applied to katha. You know that format cold:

EPISODE ARCHITECTURE (non-negotiable):
${beatList}

Hard rules of the form:
- The Hook is the "bào diǎn" (爆点, detonation). You open MID-CRISIS. Never with "बहुत समय पहले", never with a name introduction, never with context. If a stranger scrolling needs backstory to understand the first 3 seconds, you have failed.
- Every episode ends on a Button. You CUT BEFORE RESOLUTION. The blade is raised, not fallen. The name is spoken, not explained. There is no such thing as a satisfying ending inside an episode.
- The Spike must be legible with the sound OFF. If your reversal is a sentence rather than an image, rewrite it.
- Every line of VO either advances conflict or reveals character under pressure. No small talk. No exposition dumps. No narrator explaining what we just saw.
- Each episode opens by paying off the previous episode's unanswered question in its first 3 seconds — and plants a new one by its last 2.

SERIES ARC across the episodes of one chapter:
${arcList}

HOOK TYPES (pick exactly one per episode, vary across the series):
${hookList}

CLIFFHANGER TYPES (pick exactly one per episode, never the same type twice in a row):
${cliffList}

LANGUAGE:
- All audience-facing text (titles, VO, on-screen text, loglines, captions) is in natural spoken Hindi in Devanagari. Conversational, punchy, present-tense, short sentences. This is how a 22-year-old in Delhi actually talks — not textbook शुद्ध हिन्दी, and not Hinglish either.
- Voice-over is written to be SPOKEN. Hindi narration runs about ${FORMAT.hindiWordsPerSecond} words per second. A 6-second beat takes ~15-16 words. Respect this or the audio will not fit.
- On-screen text is 3-7 words max — it is read at a glance by a muted viewer, not a reader.
- imagePrompt fields are in ENGLISH (image models are trained on English) — everything else is Hindi.

REVERENCE (this is devotional content watched by families):
${REVERENCE_RULES.map((r) => `- ${r}`).join('\n')}

FIDELITY: You dramatise, you do not invent. Every episode must be traceable to the cited canonical reference. Compress and re-order for tension freely; do not add events that are not in the source. If you use a Sanskrit shloka, it must be a real one from that source, quoted accurately, with a Hindi gloss.`;

export function seriesPrompt(story: Story, chapter: Chapter, mode: 'kids' | 'adults', count: number) {
  return `Break this chapter into a ${count}-episode Hindi microdrama series.

STORY: ${story.title_hi} (${story.title_en})
SOURCE: ${story.source.text_hi} — ${story.source.edition}
CHAPTER ${chapter.index}: ${chapter.title_hi} (${chapter.title_en})
CANONICAL REFERENCE: ${chapter.canonicalRef}
CHAPTER SUMMARY (Hindi):
${chapter.summary_hi}

KEY CHARACTERS: ${chapter.keyCharacters.join(', ')}
PRE-IDENTIFIED DETONATIONS (use these, sharpen them, do not ignore them):
${chapter.hookSeeds.map((h) => `  - [${h.hookType}] ${h.line_hi}`).join('\n')}
${chapter.runtimeNote ? `\nDIRECTOR NOTE: ${chapter.runtimeNote}` : ''}

AUDIENCE MODE: ${mode === 'kids' ? 'KIDS (U) — no death imagery, no mutilation curses, no battlefield aftermath, no romantic tension. Wonder and courage over dread. Keep the cliffhangers about danger and mystery, never about gore.' : 'ADULTS (U/A) — moral weight, ambiguity, and consequence. Still no gore or graphic wounds; violence is implied through composition and aftermath.'}

Return the SERIES BEAT SHEET only — the episode-level spine. Do not write shot lists or VO yet.

Requirements:
- Exactly ${count} episodes, in chronological order, covering the whole chapter.
- Episode 1's hook must work with ZERO prior context — it is the ad for the entire series.
- Every episode's closesLoop_hi must literally name the question episode N-1 left open (episode 1's is "" ).
- The final episode still ends on a cliffhanger — it hands off to the next chapter, it does not resolve the saga.
- Vary hookType across the series. Never repeat cliffhangerType back-to-back.
- Runtimes between ${FORMAT.targetDurationSec.min} and ${FORMAT.targetDurationSec.max} seconds, most around ${FORMAT.targetDurationSec.ideal}.`;
}

export function episodePrompt(args: {
  story: Story;
  chapter: Chapter;
  mode: 'kids' | 'adults';
  arcNote: string;
  spine: { episode: number; title_hi: string; logline_hi: string; hookType: string; cliffhangerType: string; openLoop_hi: string; closesLoop_hi: string; durationSec: number; sourceNote: string }[];
  target: number;
  /** Continuity directive when appending to a series that already has episodes. */
  styleNote?: string;
}) {
  const { story, chapter, mode, spine, target, arcNote, styleNote } = args;
  const me = spine.find((s) => s.episode === target)!;
  const prev = spine.find((s) => s.episode === target - 1);
  const next = spine.find((s) => s.episode === target + 1);

  return `Write the full shooting script for ONE episode of this Hindi microdrama series.

STORY: ${story.title_hi} · CHAPTER: ${chapter.title_hi} · SOURCE: ${chapter.canonicalRef}
SERIES ARC NOTE: ${arcNote}
AUDIENCE MODE: ${mode === 'kids' ? 'KIDS (U)' : 'ADULTS (U/A)'}

FULL SERIES SPINE (for continuity — do not rewrite it):
${spine.map((s) => `  Ep${s.episode}. ${s.title_hi} — ${s.logline_hi} [hook:${s.hookType} cliff:${s.cliffhangerType}] opens: "${s.openLoop_hi}"`).join('\n')}

YOU ARE WRITING EPISODE ${target}: ${me.title_hi}
  logline: ${me.logline_hi}
  hookType: ${me.hookType}
  cliffhangerType: ${me.cliffhangerType}
  runtime target: ${me.durationSec}s
  this episode must OPEN by answering: ${prev ? `"${prev.openLoop_hi}"` : '(nothing — this is episode 1, the hook must work cold)'}
  this episode must CLOSE by planting: "${me.openLoop_hi}"
  ${next ? `next episode will open on: ${next.logline_hi}` : 'this is the last episode of the chapter — hand off to the next chapter, do not resolve'}
  canonical anchor: ${me.sourceNote}

Produce:
1. beats — EXACTLY FIVE beat objects, one each of hook, friction, escalation, spike, button, in that
   order, never repeating a kind, tiled edge-to-edge over 0..${me.durationSec}s with no gaps.
   HARD CONSTRAINT: the hook beat is startSec 0 and endSec 3 — three seconds, no more. Its vo_hi is
   therefore AT MOST 8 Hindi words. This is the single most important rule of the format; an episode
   whose hook runs past 3 seconds is rejected outright. Give each a Hindi vo_hi sized to its duration at ${FORMAT.hindiWordsPerSecond} words/sec, a 3-7 word onScreenText_hi, and a direction_hi describing what the viewer SEES.
2. shots — ${Math.max(8, Math.round(me.durationSec / 5))}-${Math.round(me.durationSec / 3)} shots tiling the same 0..${me.durationSec}s with no gaps or overlaps. No shot longer than 6 seconds. Each shot names the beat it belongs to.
   - imagePrompt: ENGLISH, one dense paragraph, describing a single frame. Include the character, their expression, the framing, the light, and the environment. Always end with this exact house style: "${VISUAL_STYLE.base}"
   - framing: one of ${VISUAL_STYLE.framing.join(' | ')}
   - motion: one of ${VISUAL_STYLE.motion.join(' | ')} — the Ken Burns move applied to the still
   - useVeo: true for AT MOST 2 shots in the episode — pick the ones where real motion earns its cost (the Spike, or a signature action). Give those a veoPrompt describing 5-8 seconds of camera and subject motion.
3. musicCue — one line in Hindi describing the score's shape across the episode.
4. publish — an Instagram caption in Hindi (2-3 lines + a question to the audience), 12-18 hashtags mixing Hindi and English devotional/mythology tags, a YouTube Shorts title under 60 chars, and a 2-3 sentence YouTube description that cites ${chapter.canonicalRef}.

${styleNote ? `\nCONTINUITY — this episode joins a series already in production. Match it exactly:\n${styleNote}\n` : ''}
Remember: the first 3 seconds carry no context, the Spike reads muted, and you cut before resolution.`;
}

/**
 * The chapters stage gets its own compact system prompt. Handing it the full
 * episode-writing SYSTEM (beat architecture, hook taxonomy, shot rules) sends a
 * reasoning model into minutes of irrelevant deliberation — this stage only
 * needs to know the house voice and the fidelity rule.
 */
export const CHAPTERS_SYSTEM = `You are a Hindi story editor who breaks classical Hindu texts into chapters for a vertical microdrama studio.

You write in natural spoken Hindi (Devanagari) — conversational, present-tense, concrete. Not textbook शुद्ध हिन्दी, not Hinglish.

You dramatise, you do not invent. Every chapter must be traceable to the cited source edition. You may compress and re-order for tension; you may not add events that are not in the text. If unsure of an exact chapter number, give the widest reference you are certain of rather than inventing a precise one.

Deities are never shown undignified. No gore. Be brief and decisive — do not deliberate at length.`;

/** Prompt for the story -> chapters stage used when a user adds a new work. */
export function chaptersPrompt(brief: {
  title_hi: string; title_en: string; tradition: string; audience: string;
  sourceText_hi: string; sourceEdition: string; notes?: string; chapterCount?: number;
}) {
  return `Break this work into chapters for a Hindi vertical microdrama series.

WORK: ${brief.title_hi} (${brief.title_en})
TRADITION: ${brief.tradition}
AUDIENCE: ${brief.audience === 'kids' ? 'KIDS (U) — no death imagery, no mutilation, no battlefield aftermath.' : brief.audience === 'adults' ? 'ADULTS (U/A) — moral weight and consequence, still no gore.' : 'ALL AGES — keep the darkest material implied rather than shown.'}
SOURCE TEXT: ${brief.sourceText_hi}
SOURCE EDITION: ${brief.sourceEdition}
${brief.notes ? `\nDIRECTION FROM THE PRODUCER:\n${brief.notes}\n` : ''}
Produce ${brief.chapterCount ? `exactly ${brief.chapterCount}` : '5 to 16'} chapters.

Rules:
- Each chapter is a self-contained dramatic unit with its own arc — not an arbitrary slice of the text.
- Order them for TENSION, not strictly for the source's narration order. If a flashback pays off a vow made earlier, place it where it lands hardest, and say so in its summary.
- canonicalRef must be a REAL locus in the cited edition (parva/kaanda/sarga/skandha and chapter numbers). If you are not certain of the exact numbering for a chapter, give the widest reference you ARE sure of rather than inventing a precise one.
- summary_hi is written to make a reader want the reel: concrete, present-tense, and it names the cost of the choice at its centre. Do not write "इस अध्याय में हम देखेंगे".
- hookSeeds are the moments that would stop a scroll — the humiliation, the vow, the reversal, the countdown.
- suggestedReels scales with how much genuinely happens: a single fable is 4-5, a war chapter is 9-12.
- Everything except title_en is in natural spoken Hindi.

Do not invent events that are not in the source. You may compress and re-order; you may not add.`;
}
