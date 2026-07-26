import { type Board } from './game.types';
import {
  buildShareText,
  guessRowsFromBoard,
  type ShareResultLabels,
  wrapLine,
} from './share-result';

const labels: ShareResultLabels = {
  title: 'Word Play',
  modeClassic: 'Classic',
  modeDaily: 'Daily word',
  won: 'Solved',
  lost: 'Missed',
  attemptsLabel: 'Attempts',
  dictionaryLabel: 'Dictionary',
  languageLabel: 'Language',
  hintsLabel: 'Hints used',
  hardModeLabel: 'Hard mode hints',
  hardModeOn: 'required',
  playLinkLabel: 'Play this puzzle',
  difficulty: {
    easy: 'Easy',
    normal: 'Normal',
    hard: 'Hard',
  },
  dictionary: {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
  },
  language: {
    en: 'EN',
    ru: 'RU',
  },
};

describe('share-result', () => {
  it('keeps only finished guess rows for the share grid', () => {
    const board: Board = [
      [
        { letter: 'C', status: 'correct' },
        { letter: 'R', status: 'present' },
        { letter: 'A', status: 'absent' },
        { letter: 'N', status: 'absent' },
        { letter: 'E', status: 'correct' },
      ],
      [
        { letter: 'A', status: 'tbd' },
        { letter: '', status: 'empty' },
        { letter: '', status: 'empty' },
        { letter: '', status: 'empty' },
        { letter: '', status: 'empty' },
      ],
    ];

    expect(guessRowsFromBoard(board)).toEqual([
      ['correct', 'present', 'absent', 'absent', 'correct'],
    ]);
  });

  it('builds share text with colored emoji grid and metadata', () => {
    const board: Board = [
      [
        { letter: 'A', status: 'absent' },
        { letter: 'B', status: 'present' },
        { letter: 'O', status: 'absent' },
        { letter: 'U', status: 'absent' },
        { letter: 'T', status: 'absent' },
      ],
      [
        { letter: 'C', status: 'correct' },
        { letter: 'R', status: 'correct' },
        { letter: 'A', status: 'correct' },
        { letter: 'N', status: 'correct' },
        { letter: 'E', status: 'correct' },
      ],
    ];

    const text = buildShareText({
      board,
      status: 'won',
      mode: 'classic',
      difficulty: 'hard',
      wordTier: 'medium',
      language: 'en',
      maxAttempts: 5,
      hintsUsed: 1,
      playUrl: 'https://example.com/word-play/classic/seed123',
      labels,
    });

    expect(text).toContain('Word Play');
    expect(text).toContain('Classic · Solved 2/5');
    expect(text).toContain('⬛🟨⬛⬛⬛');
    expect(text).toContain('🟦🟦🟦🟦🟦');
    expect(text).toContain('Attempts: Hard');
    expect(text).toContain('Dictionary: Medium');
    expect(text).toContain('Language: EN');
    expect(text).toContain('Hints used: 1');
    expect(text).toContain('Hard mode hints: required');
    expect(text).toContain('Play this puzzle:');
    expect(text).toContain('https://example.com/word-play/classic/seed123');
  });

  it('wraps long URLs so share-card text stays within the canvas width', () => {
    const url = 'https://cfgi-lul.github.io/word-play/classic/verylongseedvalue1234567890';
    const measure = (value: string): number => value.length * 10;

    expect(wrapLine(url, 120, measure)).toEqual([
      'https://cfgi',
      '-lul.github.',
      'io/word-play',
      '/classic/ver',
      'ylongseedval',
      'ue1234567890',
    ]);
    expect(wrapLine('Play this puzzle:', 200, measure)).toEqual(['Play this puzzle:']);
    expect(wrapLine('Attempts: Easy mode label', 140, measure)).toEqual([
      'Attempts: Easy',
      'mode label',
    ]);
  });

  it('includes the daily date for daily shares', () => {
    const board: Board = [
      [
        { letter: 'C', status: 'correct' },
        { letter: 'R', status: 'correct' },
        { letter: 'A', status: 'correct' },
        { letter: 'N', status: 'correct' },
        { letter: 'E', status: 'correct' },
      ],
    ];

    const text = buildShareText({
      board,
      status: 'won',
      mode: 'daily',
      difficulty: 'normal',
      wordTier: 'medium',
      language: 'ru',
      maxAttempts: 6,
      hintsUsed: 0,
      dailyDate: '2026-07-26',
      labels,
    });

    expect(text).toContain('Daily word 2026-07-26 · Solved 1/6');
    expect(text).toContain('Language: RU');
    expect(text).not.toContain('Hard mode hints');
    expect(text).not.toContain('Hints used');
  });
});
