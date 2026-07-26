import { isPlayableLetter, isValidGuess, normalizeLetter, pickRandomWord } from './words';

describe('words helpers', () => {
  it('normalizes English and Russian letters', () => {
    expect(normalizeLetter('A', 'en')).toBe('a');
    expect(normalizeLetter('Ё', 'ru')).toBe('е');
    expect(normalizeLetter('ё', 'ru')).toBe('е');
  });

  it('accepts playable letters for the selected language only', () => {
    expect(isPlayableLetter('a', 'en')).toBe(true);
    expect(isPlayableLetter('а', 'en')).toBe(false);
    expect(isPlayableLetter('а', 'ru')).toBe(true);
    expect(isPlayableLetter('a', 'ru')).toBe(false);
  });

  it('validates dictionary guesses by length and language', () => {
    expect(isValidGuess('crane', 5, 'en')).toBe(true);
    expect(isValidGuess('zzzzz', 5, 'en')).toBe(false);
    expect(isValidGuess('cran', 5, 'en')).toBe(false);
    expect(isValidGuess('слово', 5, 'ru')).toBe(true);
    expect(isValidGuess('crane', 5, 'ru')).toBe(false);
  });

  it('picks a random word of the requested length and avoids used ones', () => {
    const used = new Set(['crane']);
    const word = pickRandomWord(5, 'en', used);

    expect(word).toHaveLength(5);
    expect(isValidGuess(word, 5, 'en')).toBe(true);
    expect(used.has(word)).toBe(false);
  });
});
