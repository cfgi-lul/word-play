import {
  isPlayableLetter,
  isValidGuess,
  normalizeLetter,
  pickRandomWord,
  wordTierOf,
} from './words';

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

  it('assigns words to easy, medium, and hard dictionary tiers', () => {
    expect(wordTierOf('about', 5, 'en')).toBe('easy');
    expect(wordTierOf('crane', 5, 'en')).toBe('medium');
    expect(wordTierOf('aahed', 5, 'en')).toBe('hard');
    expect(wordTierOf('слово', 5, 'ru')).toBe('easy');
  });

  it('picks answers only from the selected dictionary tier', () => {
    for (let i = 0; i < 20; i++) {
      const word = pickRandomWord(5, 'en', new Set(), 'easy');
      expect(wordTierOf(word, 5, 'en')).toBe('easy');
      expect(isValidGuess(word, 5, 'en')).toBe(true);
    }
  });

  it('picks a random word of the requested length and avoids used ones', () => {
    const used = new Set(['crane']);
    const word = pickRandomWord(5, 'en', used, 'medium');

    expect(word).toHaveLength(5);
    expect(isValidGuess(word, 5, 'en')).toBe(true);
    expect(used.has(word)).toBe(false);
    expect(wordTierOf(word, 5, 'en')).toBe('medium');
  });
});
