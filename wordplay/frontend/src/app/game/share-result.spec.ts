import { type Board } from './game.types';
import { buildShareText, guessRowsFromBoard, type ShareResultLabels } from './share-result';

const labels: ShareResultLabels = {
  title: 'Word Play',
  modeClassic: 'Classic',
  modeDaily: 'Daily word',
  won: 'Solved',
  lost: 'Missed',
  attemptsLabel: 'Attempts',
  dictionaryLabel: 'Dictionary',
  languageLabel: 'Language',
  hardModeLabel: 'Hard mode hints',
  hardModeOn: 'required',
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
      labels,
    });

    expect(text).toContain('Word Play');
    expect(text).toContain('Classic · Solved 2/5');
    expect(text).toContain('⬛🟨⬛⬛⬛');
    expect(text).toContain('🟦🟦🟦🟦🟦');
    expect(text).toContain('Attempts: Hard');
    expect(text).toContain('Dictionary: Medium');
    expect(text).toContain('Language: EN');
    expect(text).toContain('Hard mode hints: required');
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
      dailyDate: '2026-07-26',
      labels,
    });

    expect(text).toContain('Daily word 2026-07-26 · Solved 1/6');
    expect(text).toContain('Language: RU');
    expect(text).not.toContain('Hard mode hints');
  });
});
