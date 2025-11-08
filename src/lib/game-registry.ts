export const IMPLEMENTED_GAME_CODES = [
  'schulte',
  'letter_search',
  'word_race',
  'number_memory',
  'word_race_rsvp',
  'word_chain',
  'twin_words',
  'even_odd',
  'anagrams',
  'find_number',
  'visual_field',
  'find_words',
  'text_scanning',
  'reading_accelerator',
  'neuron_accelerator'
] as const;

export type ImplementedGameCode = typeof IMPLEMENTED_GAME_CODES[number];

export function isImplementedGame(code: string | null | undefined): code is ImplementedGameCode {
  return !!code && IMPLEMENTED_GAME_CODES.includes(code as ImplementedGameCode);
}

export function filterImplementedGames<T extends { code: string | null | undefined }>(games: T[]): T[] {
  return games.filter((game) => isImplementedGame(game.code));
}
