// Word placement validation.
//
// README, "Placing a word": validate in this order — blank assigned, minimum
// length, not a duplicate in this hand, in dictionary (when strict), a free slot
// exists. Each failure gets its own specific message, because "invalid word" is
// useless feedback.

import { isWord } from './dictionary.js';

export function validatePlacement({ ruleset, build, slots, strict, dict }) {
  const min = ruleset.minimumWordLength;
  const word = build.map((t) => t.letter).join('').toUpperCase();

  if (build.some((t) => t.blank && !t.letter)) {
    return { ok: false, reason: 'Assign a letter to the blank tile before placing.' };
  }
  if (build.length < min) {
    return { ok: false, reason: `Words need at least ${min} letters.` };
  }
  if (slots.some((s) => s && s.word === word)) {
    return {
      ok: false,
      reason: `${word} is already in this hand. The same word cannot appear twice in one turn — though you may play it again on a later turn.`
    };
  }
  if (strict) {
    if (!dict || dict.status === 'loading') {
      return { ok: false, reason: 'The dictionary is still loading. Try again in a moment.' };
    }
    if (dict.status !== 'ready') {
      return {
        ok: false,
        reason:
          'The selected dictionary could not be loaded, so words cannot be checked. Pick another dictionary in Settings, or turn off Strict dictionary.'
      };
    }
    if (!isWord(dict, word)) {
      return {
        ok: false,
        reason: `${word} is not in the selected dictionary. Try another arrangement — or turn off Strict dictionary in Settings if you are sure.`
      };
    }
  }
  if (!slots.some((s) => !s)) {
    return {
      ok: false,
      reason: 'All five slots are filled. Tap a provisional word to dismantle it first.'
    };
  }
  return { ok: true, word };
}
