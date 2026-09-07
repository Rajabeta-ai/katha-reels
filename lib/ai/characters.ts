import fs from 'node:fs';
import path from 'node:path';
import { ASSET_DIR } from '../store';
import { VISUAL_STYLE } from '../microdrama';

/**
 * Character consistency.
 *
 * Every still is an independent generation, so the same character drifts from
 * shot to shot — a different Drona in shot 1 and shot 4. The fix is a reference
 * sheet: generate each face ONCE at series level, then pass that image as a
 * reference on every shot featuring them. Gemini's image models accept inline
 * image parts alongside the text prompt and hold likeness across generations.
 *
 * Sheets live per-series (not per-reel) so a whole chapter shares one cast.
 */

export const CAST_DIR = 'cast';

/** Canonical looks. Written once, reused across every chapter the character appears in. */
export const CAST: Record<string, string> = {
  'द्रोणाचार्य':
    'An aged Indian warrior-brahmin general, late 60s, long white beard and white hair tied back, ' +
    'severe hooded eyes, deep lines, a sacred thread across a bronze-and-gold breastplate over ' +
    'ochre robes, a faint white tilak on the forehead.',
  'दुर्योधन':
    'A powerful Indian prince in his 40s, heavy build, thick black moustache, no beard, arrogant ' +
    'set to the jaw, a tall jewelled gold crown, deep purple silk and gold ornamental armour, ' +
    'heavy gold earrings.',
  'अर्जुन':
    'A noble Indian warrior in his late 30s, clean-shaven, lean athletic build, calm intense eyes, ' +
    'a silver-and-blue diadem over black shoulder-length hair, silver-blue armour with a peacock motif.',
  'युधिष्ठिर':
    'An older Indian king, early 50s, short greying beard, gentle troubled eyes, a plain thin gold ' +
    'circlet, restrained cream and gold robes with little ornament.',
  'अभिमन्यु':
    'A sixteen-year-old Indian warrior prince, smooth unlined face, no facial hair, bright fearless ' +
    'eyes, curly black hair under a light gold helmet, slim silver-gold armour sized for a youth.',
  'कृष्ण':
    'A serene Indian man in his 40s with distinctive blue-toned skin, peacock feather in his crown, ' +
    'yellow silk dhoti, calm knowing half-smile, lotus-shaped eyes.',
  'धृष्टद्युम्न':
    'A fierce Indian commander in his 30s, sharp angular face, short black beard, intense wide-set ' +
    'eyes, dark red and bronze armour, a flame motif on the breastplate.',
  'जयद्रथ':
    'An Indian king in his 40s, narrow calculating face, thin moustache, a hard thin mouth, ' +
    'dark green and gold armour, a heavy jewelled collar.',
  'भीम':
    'A huge powerfully built Indian warrior in his 40s, barrel chest and massive shoulders, thick ' +
    'black moustache and short beard, fierce blunt features, dark blue and bronze armour, a heavy ' +
    'mace at his side.',
  'सात्यकि':
    'A wiry Indian warrior in his 30s, sharp alert face, close-cropped beard, a scar along one ' +
    'cheekbone, practical dark leather and bronze armour with few ornaments.',
  'कर्ण':
    'An Indian warrior in his 40s, golden-toned skin, noble weathered face, short beard, sorrowful ' +
    'proud eyes, golden armour and large golden earrings, sun motif.',
};

export function sheetPath(seriesId: string, name: string) {
  const dir = path.join(ASSET_DIR, CAST_DIR, seriesId);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${slug(name)}.jpg`);
}

export function hasSheet(seriesId: string, name: string) {
  return fs.existsSync(sheetPath(seriesId, name));
}

/** The prompt that produces a clean, reusable reference portrait. */
export function sheetPrompt(name: string) {
  const look = CAST[name];
  if (!look) return null;
  return (
    `Character reference portrait. ${look} ` +
    `Neutral expression, head and shoulders, facing three-quarters toward camera, evenly lit on a ` +
    `plain dark neutral background so the face reads clearly. ${VISUAL_STYLE.base} ` +
    `Full-bleed image that fills the entire frame edge to edge. Render no text, no watermark, no border, no frame, no matte, no vignette, no painted edge.`
  );
}

/**
 * Reference sheets for whichever cast members a shot prompt names. Used by both
 * the batch pipeline and single-shot regeneration, so a hand-retried shot keeps
 * the same faces as the rest of the episode.
 */
export function refsForPrompt(seriesId: string, imagePrompt: string): string[] {
  const hay = imagePrompt.toLowerCase();
  return Object.keys(CAST)
    .filter((n) => (EN_ALIASES[n] ?? []).some((a) => hay.includes(a.toLowerCase())))
    .map((n) => sheetPath(seriesId, n))
    .filter((f) => fs.existsSync(f));
}

/** Cast members a shot prompt names, whether or not a sheet exists yet. */
export function castNamesInPrompts(prompts: string[]): string[] {
  return Object.keys(CAST).filter((n) =>
    (EN_ALIASES[n] ?? []).some((a) => prompts.some((p) => p.toLowerCase().includes(a.toLowerCase()))),
  );
}

/** Which cast members a shot prompt refers to. */
export function castInPrompt(imagePrompt: string, characters: string[]): string[] {
  const hay = imagePrompt.toLowerCase();
  return characters.filter((c) => {
    const en = EN_ALIASES[c];
    return en ? en.some((a) => hay.includes(a.toLowerCase())) : false;
  });
}

/** Shot prompts are English, the cast keys are Hindi — bridge the two. */
export const EN_ALIASES: Record<string, string[]> = {
  'द्रोणाचार्य': ['drona', 'dronacharya'],
  'दुर्योधन': ['duryodhana', 'duryodhan'],
  'अर्जुन': ['arjuna', 'arjun'],
  'युधिष्ठिर': ['yudhishthira', 'yudhisthira'],
  'अभिमन्यु': ['abhimanyu'],
  'कृष्ण': ['krishna'],
  'धृष्टद्युम्न': ['dhrishtadyumna', 'dhrstadyumna'],
  'जयद्रथ': ['jayadratha', 'jayadrath'],
  'भीम': ['bhima', 'bheem'],
  'सात्यकि': ['satyaki'],
  'कर्ण': ['karna'],
};

const slug = (s: string) =>
  Buffer.from(s).toString('base64url').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
