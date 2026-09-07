/**
 * Hindi TTS text preparation.
 *
 * Captions and the VO field keep their canonical, correct Devanagari spelling —
 * this layer rewrites a COPY on its way to ElevenLabs only. Two classes of fix:
 *
 *  1. Structural: em-dashes and digits, which TTS either swallows or reads in
 *     the wrong language.
 *  2. Lexical: Sanskrit proper nouns whose conjuncts and visargas the model
 *     mangles. Splitting a long compound at its morpheme boundary, or writing a
 *     visarga the way Hindi actually says it, fixes most of them.
 */

/** Canonical spelling -> spelling that reads correctly aloud. */
export const LEXICON: Record<string, string> = {
  // Visarga (ः) is routinely mispronounced or dropped; Hindi realises it as gemination.
  'दुःशासन': 'दुश्शासन',
  'दुःख': 'दुख',
  'अंतःपुर': 'अंतःपुर',

  // Long conjunct compounds — a space at the morpheme seam stops the model
  // collapsing the cluster.
  'धृष्टद्युम्न': 'धृष्ट द्युम्न',
  'चक्रव्यूह': 'चक्र व्यूह',
  'अश्वत्थामा': 'अश्वत्थामा',
  'बृहन्नला': 'बृहन् नला',
  'शिखण्डी': 'शिखंडी',
  'मेघनाद': 'मेघनाद',
  'कुम्भकर्ण': 'कुंभकर्ण',
  'लक्ष्मण': 'लक्ष्मण',
  'द्रोणाचार्य': 'द्रोणाचार्य',
  'संशप्तक': 'संशप्तक',
  'महाप्रस्थानिक': 'महा प्रस्थानिक',
  'सौप्तिक': 'सौप्तिक',
  'जरासंध': 'जरासंध',
  'कुवलयापीड़': 'कुवलयापीड़',
  'सांवर्तक': 'सांवर्तक',
  'त्रिजटा': 'त्रिजटा',
  'विश्वामित्र': 'विश्वामित्र',
  'ऋष्यशृंग': 'ऋष्य शृंग',
  'हिडिम्ब': 'हिडिंब',
  'घटोत्कच': 'घटोत्कच',
};

const DIGITS_HI: Record<string, string> = {
  '0': 'शून्य', '1': 'एक', '2': 'दो', '3': 'तीन', '4': 'चार',
  '5': 'पाँच', '6': 'छह', '7': 'सात', '8': 'आठ', '9': 'नौ',
};
const NUMBERS_HI: Record<string, string> = {
  '10': 'दस', '11': 'ग्यारह', '12': 'बारह', '13': 'तेरह', '14': 'चौदह', '16': 'सोलह',
  '18': 'अठारह', '100': 'सौ', '1000': 'हज़ार',
};

/**
 * Rewrite one Hindi VO line for the TTS engine. Never mutate the stored text —
 * on-screen captions must keep the canonical spelling.
 */
export function prepareForTts(text: string): string {
  let out = text;

  // Longest-first so "दुःशासन" wins over any shorter overlapping key.
  for (const key of Object.keys(LEXICON).sort((a, b) => b.length - a.length)) {
    out = out.split(key).join(LEXICON[key]);
  }

  // Numerals: whole numbers first, then any stragglers digit by digit.
  out = out.replace(/\d+/g, (n) => NUMBERS_HI[n] ?? [...n].map((d) => DIGITS_HI[d] ?? d).join(' '));

  // An em-dash is a beat of silence in the writing but a swallowed character to
  // the model. A comma is what it actually honours.
  out = out.replace(/\s*—\s*/g, ', ').replace(/\s*–\s*/g, ', ');

  // Devanagari danda -> full stop, which the model treats as a sentence break.
  out = out.replace(/।/g, '.');

  // Collapse the artefacts of the substitutions above.
  return out.replace(/,\s*,/g, ',').replace(/\s{2,}/g, ' ').replace(/\s+([.,])/g, '$1').trim();
}

/** Which names in a line were rewritten — surfaced in the monitor. */
export function lexiconHits(text: string): { from: string; to: string }[] {
  return Object.entries(LEXICON)
    .filter(([k]) => text.includes(k))
    .map(([from, to]) => ({ from, to }));
}
