import { TestBed } from '@angular/core/testing';

import { evaluateGuess, GameService, satisfiesHardMode } from './game.service';
import { attemptsForDifficulty, type GameState } from './game.types';
import { HistoryService } from './history.service';
import { encodePuzzleSeed } from './puzzle-seed';

describe('GameService', () => {
  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('maps difficulty to attempt counts', () => {
    expect(attemptsForDifficulty('easy')).toBe(8);
    expect(attemptsForDifficulty('normal')).toBe(6);
    expect(attemptsForDifficulty('hard')).toBe(5);
  });

  it('evaluates correct, present, and absent letters', () => {
    expect(evaluateGuess('crane', 'crane')).toEqual([
      'correct',
      'correct',
      'correct',
      'correct',
      'correct',
    ]);
    expect(evaluateGuess('trace', 'crane')).toEqual([
      'absent',
      'correct',
      'correct',
      'present',
      'correct',
    ]);
    expect(evaluateGuess('zzzzz', 'crane')).toEqual([
      'absent',
      'absent',
      'absent',
      'absent',
      'absent',
    ]);
  });

  it('handles duplicate letters in evaluation', () => {
    expect(evaluateGuess('apple', 'plead')).toEqual([
      'present',
      'present',
      'absent',
      'present',
      'present',
    ]);
  });

  it('requires green letters to stay in place on hard mode', () => {
    const solution = 'crane';
    const previous = ['crate'];
    expect(evaluateGuess(previous.at(0)!, solution)).toEqual([
      'correct',
      'correct',
      'correct',
      'absent',
      'correct',
    ]);
    expect(satisfiesHardMode('plane', previous, solution)).toBe(false);
    expect(satisfiesHardMode('crane', previous, solution)).toBe(true);
  });

  it('requires yellow letters to be reused on hard mode', () => {
    const solution = 'crane';
    const previous = ['outer'];
    expect(evaluateGuess(previous.at(0)!, solution)).toContain('present');
    expect(satisfiesHardMode('plaid', previous, solution)).toBe(false);
    expect(satisfiesHardMode('reach', previous, solution)).toBe(true);
  });

  it('accepts typed letters and rejects too-short submits', () => {
    const game = createGame({ solution: 'crane' });

    game.addLetter('c');
    game.addLetter('r');
    expect(game.currentGuess()).toBe('cr');
    expect(game.submitGuess()).toBe('too-short');

    game.removeLetter();
    expect(game.currentGuess()).toBe('c');
  });

  it('rejects guesses that are not in the dictionary', () => {
    const game = createGame({ solution: 'crane' });

    typeWord(game, 'zzzzz');
    expect(game.submitGuess()).toBe('invalid');
    expect(game.status()).toBe('playing');
    expect(game.guessesCount()).toBe(0);
  });

  it('wins when the solution is guessed', () => {
    const game = createGame({ solution: 'crane' });
    const history = TestBed.inject(HistoryService);

    typeWord(game, 'crane');
    expect(game.submitGuess()).toBe('ok');
    expect(game.status()).toBe('won');
    expect(game.isPlaying()).toBe(false);
    expect(history.all().some((entry) => entry.word === 'crane' && entry.status === 'won')).toBe(
      true,
    );
  });

  it('marks a wrong valid guess and updates keyboard colors', () => {
    const game = createGame({ solution: 'crane' });

    typeWord(game, 'about');
    expect(game.submitGuess()).toBe('ok');
    expect(game.status()).toBe('playing');
    expect(game.guessesCount()).toBe(1);
    expect(game.keyboard()['a']).toBe('present');
    expect(game.keyboard()['b']).toBe('absent');
    expect(game.board()).toHaveLength(6);
    expect(game.board().at(0)?.at(0)?.status).toBe('present');
  });

  it('loses after the maximum number of attempts', () => {
    const game = createGame({ solution: 'crane' });
    const history = TestBed.inject(HistoryService);
    const misses = ['about', 'slate', 'flame', 'grape', 'bloom', 'humid'];

    for (const word of misses) {
      typeWord(game, word);
      expect(game.submitGuess()).toBe('ok');
    }

    expect(game.status()).toBe('lost');
    expect(game.maxAttempts()).toBe(6);
    expect(game.board()).toHaveLength(6);
    expect(history.all().some((entry) => entry.word === 'crane' && entry.status === 'lost')).toBe(
      true,
    );
  });

  it('enforces hard-mode constraints after a revealing guess', () => {
    const game = createGame({
      solution: 'crane',
      difficulty: 'hard',
      maxAttempts: 5,
    });

    typeWord(game, 'crate');
    expect(game.submitGuess()).toBe('ok');

    typeWord(game, 'plane');
    expect(game.submitGuess()).toBe('hard-mode');
    expect(game.guessesCount()).toBe(1);
    expect(game.status()).toBe('playing');
  });

  it('switches difficulty and rebuilds the board attempt count', () => {
    const game = createGame({ solution: 'crane' });

    expect(game.maxAttempts()).toBe(6);
    game.setDifficulty('easy');
    expect(game.difficulty()).toBe('easy');
    expect(game.maxAttempts()).toBe(8);
    expect(game.board()).toHaveLength(8);

    game.setDifficulty('hard');
    expect(game.difficulty()).toBe('hard');
    expect(game.maxAttempts()).toBe(5);
    expect(game.board()).toHaveLength(5);
  });

  it('switches word length and language settings', () => {
    const game = createGame({ solution: 'crane' });

    game.setWordLength(4);
    expect(game.wordLength()).toBe(4);
    expect(game.board().at(0)).toHaveLength(4);

    game.setLanguage('ru');
    expect(game.language()).toBe('ru');
    expect(game.isPlaying()).toBe(true);
  });

  it('starts a new game after a win', () => {
    const game = createGame({ solution: 'crane' });

    typeWord(game, 'crane');
    expect(game.submitGuess()).toBe('ok');
    expect(game.status()).toBe('won');

    game.startNewGame();
    expect(game.status()).toBe('playing');
    expect(game.guessesCount()).toBe(0);
    expect(game.currentGuess()).toBe('');
    expect(game.solution().length).toBe(5);
  });

  it('resets an in-progress classic game with a fresh board', () => {
    const game = createGame({ solution: 'crane' });

    typeWord(game, 'about');
    expect(game.submitGuess()).toBe('ok');
    expect(game.guessesCount()).toBe(1);
    expect(game.useHint()).toBe('ok');
    expect(game.hintsUsed()).toBe(1);

    game.startNewGame();

    expect(game.status()).toBe('playing');
    expect(game.guessesCount()).toBe(0);
    expect(game.currentGuess()).toBe('');
    expect(game.hintsUsed()).toBe(0);
    expect(game.keyboard()).toEqual({});
    expect(game.solution().length).toBe(5);
    expect(
      game
        .board()
        .at(0)
        ?.every((tile) => tile.status === 'empty'),
    ).toBe(true);
  });

  it('switches dictionary tier and keeps a separate in-progress game', () => {
    const game = createGame({ solution: 'crane', wordTier: 'medium' });

    expect(game.wordTier()).toBe('medium');
    game.setWordTier('easy');
    expect(game.wordTier()).toBe('easy');
    expect(game.isPlaying()).toBe(true);
    expect(game.solution().length).toBe(5);
  });

  it('loads a seeded daily puzzle without difficulty settings', () => {
    localStorage.clear();
    localStorage.setItem('word-play-word-length', '5');
    localStorage.setItem('word-play-game-language', 'en');
    localStorage.setItem('word-play-game-mode', 'daily');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const game = TestBed.inject(GameService);

    game.activateMode('daily');
    expect(game.mode()).toBe('daily');
    expect(game.difficulty()).toBe('normal');
    expect(game.wordTier()).toBe('medium');
    expect(game.maxAttempts()).toBe(6);
    expect(game.canPlayAgain()).toBe(false);
    expect(game.solution()).toHaveLength(5);
    expect(game.dailyDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    game.setDifficulty('hard');
    expect(game.difficulty()).toBe('normal');
    expect(game.maxAttempts()).toBe(6);
  });

  it('does not start a new daily puzzle with play again', () => {
    localStorage.clear();
    localStorage.setItem('word-play-word-length', '5');
    localStorage.setItem('word-play-game-language', 'en');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const game = TestBed.inject(GameService);
    game.activateMode('daily');
    const solution = game.solution();

    typeWord(game, solution);
    expect(game.submitGuess()).toBe('ok');
    expect(game.status()).toBe('won');

    game.startNewGame();
    expect(game.status()).toBe('won');
    expect(game.solution()).toBe(solution);
  });

  it('reveals one correct letter with a hint and records it on finish', () => {
    const game = createGame({ solution: 'crane' });
    const history = TestBed.inject(HistoryService);

    expect(game.canUseHint()).toBe(true);
    expect(game.useHint()).toBe('ok');
    expect(game.hintsUsed()).toBe(1);
    expect(game.canUseHint()).toBe(false);
    expect(game.useHint()).toBe('none-left');

    const currentRow = game.board().at(0)!;
    const revealed = currentRow.filter((tile) => tile.status === 'correct');
    expect(revealed).toHaveLength(1);
    expect(game.solution().toUpperCase()).toContain(revealed.at(0)!.letter);

    typeWord(game, 'crane');
    expect(game.submitGuess()).toBe('ok');
    expect(history.all().at(0)?.hintsUsed).toBe(1);
  });

  it('activates a classic puzzle from a shareable seed', () => {
    const seed = encodePuzzleSeed({
      language: 'en',
      wordLength: 5,
      difficulty: 'normal',
      wordTier: 'medium',
      solution: 'crane',
    });

    localStorage.clear();
    localStorage.setItem('word-play-word-length', '5');
    localStorage.setItem('word-play-game-language', 'en');
    localStorage.setItem('word-play-difficulty', 'normal');
    localStorage.setItem('word-play-word-tier', 'medium');
    localStorage.setItem('word-play-game-mode', 'classic');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const game = TestBed.inject(GameService);

    expect(game.activateClassicSeed(seed)).toBe(true);
    expect(game.mode()).toBe('classic');
    expect(game.solution()).toBe('crane');
    expect(game.puzzleSeed()).toBe(seed);
    expect(game.activateClassicSeed('bad-seed')).toBe(false);
  });

  it('requires hinted letters in hard mode guesses', () => {
    const game = createGame({
      solution: 'crane',
      difficulty: 'hard',
      maxAttempts: 5,
      hintedPositions: [0],
      hintsUsed: 1,
    });

    typeWord(game, 'plane');
    expect(game.submitGuess()).toBe('hard-mode');

    while (game.currentGuess().length > 0) {
      game.removeLetter();
    }
    typeWord(game, 'crane');
    expect(game.submitGuess()).toBe('ok');
  });
});

function createGame(partial: Partial<GameState> = {}): GameService {
  const difficulty = partial.difficulty ?? 'normal';
  const wordTier = partial.wordTier ?? 'medium';
  const maxAttempts = partial.maxAttempts ?? attemptsForDifficulty(difficulty);

  localStorage.clear();
  localStorage.setItem('word-play-word-length', '5');
  localStorage.setItem('word-play-game-language', 'en');
  localStorage.setItem('word-play-difficulty', difficulty);
  localStorage.setItem('word-play-word-tier', wordTier);
  localStorage.setItem('word-play-game-mode', 'classic');
  localStorage.setItem(
    `word-play-game-en-5-${difficulty}-${wordTier}`,
    JSON.stringify({
      mode: 'classic',
      language: 'en',
      wordLength: 5,
      difficulty,
      wordTier,
      maxAttempts,
      solution: 'crane',
      guesses: [],
      currentGuess: '',
      status: 'playing',
      keyboard: {},
      hintedPositions: [],
      hintsUsed: 0,
      ...partial,
    } satisfies GameState),
  );

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});
  return TestBed.inject(GameService);
}

function typeWord(game: GameService, word: string): void {
  for (const letter of word) {
    game.addLetter(letter);
  }
}
