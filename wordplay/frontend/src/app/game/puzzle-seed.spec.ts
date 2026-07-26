import { decodePuzzleSeed, encodePuzzleSeed } from './puzzle-seed';

describe('puzzle-seed', () => {
  it('round-trips classic puzzle settings and solution', () => {
    const seed = encodePuzzleSeed({
      language: 'en',
      wordLength: 5,
      difficulty: 'hard',
      wordTier: 'medium',
      solution: 'crane',
    });

    expect(seed.length).toBeGreaterThan(8);
    expect(seed).not.toContain('crane');
    expect(decodePuzzleSeed(seed)).toEqual({
      language: 'en',
      wordLength: 5,
      difficulty: 'hard',
      wordTier: 'medium',
      solution: 'crane',
    });
  });

  it('rejects tampered or unknown seeds', () => {
    expect(decodePuzzleSeed('not-a-seed')).toBeNull();
    expect(decodePuzzleSeed('')).toBeNull();
  });

  it('rejects seeds whose word is not in the dictionary', () => {
    // Craft a valid envelope with a non-dictionary solution.
    const fake = encodePuzzleSeed({
      language: 'en',
      wordLength: 5,
      difficulty: 'normal',
      wordTier: 'medium',
      solution: 'crane',
    });

    const decoded = decodePuzzleSeed(fake);
    expect(decoded).not.toBeNull();

    const invalid = encodePuzzleSeed({
      language: 'en',
      wordLength: 5,
      difficulty: 'normal',
      wordTier: 'medium',
      // Bypass encode normalization by decoding after mutating via a word that
      // encode will still accept length-wise but isValidGuess rejects — use zzzzz
      // which is not a valid guess word.
      solution: 'zzzzz',
    });
    expect(decodePuzzleSeed(invalid)).toBeNull();
  });
});
