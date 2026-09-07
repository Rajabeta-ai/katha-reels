/**
 * The microdrama contract.
 *
 * Encodes the Chinese duanju (短剧) vertical-drama formula, adapted for Hindu
 * katha. Every generated reel is validated against this, and the Reel Monitor
 * UI renders directly off these constants — so the structure is one source of
 * truth, not prose in a prompt.
 *
 * Sources for the formula (see /docs/microdrama-research.md):
 *  - bào diǎn (爆点, "detonation"): the 0-3s stop-the-scroll hook
 *  - four-beat episode: Hook -> Friction -> Spike -> Button
 *  - the Button (cliffhanger) is not optional; it *is* the product
 *  - cut BEFORE resolution, never after
 *  - the Spike must read with the sound off
 */

export const FORMAT = {
  width: 1080,
  height: 1920,
  fps: 30,
  aspect: '9:16',
  /** Instagram Reels chrome eats the top ~14% and bottom ~22%. Keep text inside. */
  safeTopPx: 260,
  safeBottomPx: 420,
  targetDurationSec: { min: 45, ideal: 68, max: 90 },
  /** Hindi narration pace, syllable-dense; measured against ElevenLabs multilingual v2. */
  hindiWordsPerSecond: 2.6,
} as const;

export type BeatKind = 'hook' | 'friction' | 'escalation' | 'spike' | 'button';

export const BEATS: {
  kind: BeatKind;
  label_hi: string;
  label_en: string;
  /** Fraction of total episode runtime. */
  share: [number, number];
  rule: string;
}[] = [
  {
    kind: 'hook',
    label_hi: 'धमाका',
    label_en: 'Hook / bào diǎn',
    share: [0, 0.06],
    rule: 'Open mid-crisis. No names, no context, no "long ago". A stranger scrolling must understand the stakes in 3 seconds with zero backstory.',
  },
  {
    kind: 'friction',
    label_hi: 'टकराव',
    label_en: 'Friction',
    share: [0.06, 0.45],
    rule: 'Two forces in one space under pressure. Conflict is shown, never explained. Every line advances or reveals — no small talk, no exposition.',
  },
  {
    kind: 'escalation',
    label_hi: 'चढ़ाव',
    label_en: 'Escalation',
    share: [0.45, 0.72],
    rule: 'Raise the cost. Someone loses ground, an ally turns, a deadline closes. The audience should feel the floor tilting.',
  },
  {
    kind: 'spike',
    label_hi: 'पलटवार',
    label_en: 'Spike / reversal',
    share: [0.72, 0.9],
    rule: 'A reversal that re-prices everything before it. MUST be legible with the sound muted — it has to land as an image, not a sentence.',
  },
  {
    kind: 'button',
    label_hi: 'कट',
    label_en: 'Button / cliffhanger',
    share: [0.9, 1],
    rule: 'Cut BEFORE resolution. Blade raised, not fallen. Name spoken, not explained. Ends on an unanswered question the next episode opens on.',
  },
];

/**
 * Hook taxonomy. The left column is the duanju trope; the right is its native
 * equivalent in Hindu katha — which is where these tropes largely came from.
 */
export const HOOK_TYPES = [
  { id: 'pratigya',      hi: 'प्रतिज्ञा',        en: 'The Vow',              duanju: '立誓 / oath-open',        example: 'भीष्म की भीषण प्रतिज्ञा' },
  { id: 'shraap',        hi: 'श्राप',            en: 'The Curse',            duanju: '诅咒 / doom-clock',       example: 'कर्ण को परशुराम का श्राप' },
  { id: 'chhal',         hi: 'छल',               en: 'The Rigged Game',      duanju: '陷害 / the setup',        example: 'शकुनि के पासे' },
  { id: 'apmaan',        hi: 'अपमान',            en: 'The Public Humiliation', duanju: '打脸 / face-slap',      example: 'द्रौपदी चीरहरण' },
  { id: 'gupt-pehchan',  hi: 'गुप्त पहचान',      en: 'Hidden Identity',      duanju: '马甲 / the alt',          example: 'कर्ण कुंती-पुत्र है' },
  { id: 'dharm-sankat',  hi: 'धर्मसंकट',         en: 'Impossible Choice',    duanju: '两难 / the fork',         example: 'अर्जुन का विषाद' },
  { id: 'vishwasghat',   hi: 'विश्वासघात',       en: 'Betrayal',             duanju: '背叛',                     example: 'जयद्रथ का द्वार रोकना' },
  { id: 'vardaan',       hi: 'वरदान',            en: 'The Wish Backfires',   duanju: '金手指 / cursed gift',     example: 'भस्मासुर का वरदान' },
  { id: 'pariksha',      hi: 'परीक्षा',          en: 'The Test',             duanju: '试炼',                     example: 'सीता की अग्निपरीक्षा' },
  { id: 'pratishodh',    hi: 'प्रतिशोध',         en: 'Vengeance Clock',      duanju: '复仇',                     example: 'अश्वत्थामा की रात' },
  { id: 'bali',          hi: 'बलिदान',           en: 'The Sacrifice',        duanju: '献祭',                     example: 'बर्बरीक का शीशदान' },
  { id: 'bhavishyavani', hi: 'भविष्यवाणी',       en: 'The Prophecy',         duanju: '预言',                     example: 'आकाशवाणी — कंस का काल' },
  { id: 'antim-ghadi',   hi: 'अंतिम घड़ी',        en: 'The Countdown',        duanju: '倒计时 / clock',          example: 'सूर्यास्त तक जयद्रथ' },
] as const;

export const CLIFFHANGER_TYPES = [
  { id: 'astra-uthaa',    hi: 'अस्त्र उठा, चला नहीं',   en: 'Weapon raised, not released' },
  { id: 'naam-adhoora',   hi: 'नाम अधूरा',              en: 'Name spoken, half-revealed' },
  { id: 'dwaar-khula',    hi: 'द्वार खुला',             en: 'The door opens on someone' },
  { id: 'shraap-shuru',   hi: 'श्राप शुरू',             en: 'Curse begins mid-word' },
  { id: 'suryast',        hi: 'सूर्यास्त निकट',         en: 'Deadline closing' },
  { id: 'sach-khula',     hi: 'सच खुला, चेहरा नहीं',    en: 'Truth revealed to us, not to them' },
  { id: 'prashn',         hi: 'प्रश्न अधर में',         en: 'Question left hanging' },
  { id: 'gir-gaya',       hi: 'कोई गिरा',               en: 'Someone falls, cut to black' },
] as const;

export type HookTypeId = (typeof HOOK_TYPES)[number]['id'];
export type CliffhangerTypeId = (typeof CLIFFHANGER_TYPES)[number]['id'];

/** Series-level arc shape, scaled to a chapter's reel count. */
export const SERIES_ARC = [
  { at: 0.0,  phase: 'premise',    note: 'Establish the world and the wound. 2-3 emotional peaks before anyone can get bored.' },
  { at: 0.25, phase: 'escalation', note: 'Layer the subplot. Introduce the force that will cause the chapter\'s worst moment.' },
  { at: 0.6,  phase: 'darkest',    note: 'Lowest point. Maximum investment. The audience must not be able to see the way out.' },
  { at: 0.85, phase: 'resolution', note: 'Pay off the small loops first, the central one last — and leave one thread for the next chapter.' },
] as const;

/** Automated QC the Reel Monitor runs on every generated reel. */
export type QcCheck = { id: string; label: string; severity: 'blocker' | 'warn' };
export const QC_CHECKS: QcCheck[] = [
  { id: 'hook_under_3s',     label: 'Hook beat lands within 3.0s',                       severity: 'blocker' },
  { id: 'has_button',        label: 'Ends on a Button (cliffhanger), not a resolution',   severity: 'blocker' },
  { id: 'duration_in_range', label: `Runtime ${FORMAT.targetDurationSec.min}-${FORMAT.targetDurationSec.max}s`, severity: 'blocker' },
  { id: 'vo_fits',           label: 'Hindi VO fits its beat at 2.6 words/sec (±15%)',     severity: 'warn' },
  { id: 'mute_legible',      label: 'Spike is described as a visual, not a line',         severity: 'warn' },
  { id: 'no_cold_exposition',label: 'First 5s carries no "once upon a time" exposition',   severity: 'blocker' },
  { id: 'loop_opened',       label: 'Opens a question this reel does not answer',          severity: 'blocker' },
  { id: 'loop_closed',       label: 'Answers the previous reel\'s question in its Hook',   severity: 'warn' },
  { id: 'shots_cover',       label: 'Shots tile the full runtime with no gap/overlap',     severity: 'blocker' },
  { id: 'shot_pace',         label: 'No single shot longer than 6s (scroll-away risk)',    severity: 'warn' },
  { id: 'text_safe_area',    label: 'On-screen text within IG/Shorts safe area',           severity: 'warn' },
];

/** Visual house style shared by every image prompt so a series looks like one show. */
export const VISUAL_STYLE = {
  base:
    'Cinematic devotional Indian mythological art. Painterly realism with hand-painted texture, ' +
    'not photoreal, not 3D render, not cartoon. Rich saturated palette: deep indigo, temple gold, ' +
    'vermilion, ochre. Dramatic single-source lighting with strong rim light and volumetric haze. ' +
    'Shallow depth of field. Vertical 9:16 composition with the subject in the upper-middle third ' +
    'so the lower third stays clear for captions.',
  negative:
    'no text, no watermark, no logos, no modern clothing, no wristwatch, no glasses, no signature, ' +
    'no extra limbs, no distorted hands, no gore, no blood spatter, no horizontal letterboxing',
  framing: ['extreme close-up', 'close-up', 'medium close-up', 'over-the-shoulder', 'low-angle hero', 'wide establishing'] as const,
  motion: ['kenburns-in', 'kenburns-out', 'pan-left', 'pan-right', 'tilt-up', 'tilt-down', 'static'] as const,
};

export type MotionId = (typeof VISUAL_STYLE.motion)[number];

/** Devotional-content guardrails baked into every generation. */
export const REVERENCE_RULES = [
  'Deities are never shown in undignified, comic, or romantic-suggestive framing.',
  'No blood, gore, or graphic wounds — violence is implied through composition and aftermath.',
  'No invented scripture: dialogue may dramatise, but events must follow the cited source text.',
  'Sanskrit shlokas are quoted only where they genuinely appear in the source, with a Hindi gloss.',
  'Kid-mode reels drop death imagery, curses of mutilation, and all battlefield aftermath.',
];
