import { computed, inject, Injectable, signal } from '@angular/core';

import { dailyDateKey, pickDailyWord } from './daily-word';
import { DifficultyService } from './difficulty.service';
import {
  attemptsForDifficulty,
  type Board,
  DAILY_DIFFICULTY,
  DAILY_WORD_TIER,
  type Difficulty,
  type GameLanguage,
  type GameMode,
  type GameState,
  type GameStatus,
  isDifficulty,
  isGameLanguage,
  isWordLength,
  isWordTier,
  type KeyStatus,
  type LetterStatus,
  MAX_HINTS_PER_GAME,
  type Tile,
  type WordLength,
  type WordTier,
} from './game.types';
import { GameLanguageService } from './game-language.service';
import { GameModeService } from './game-mode.service';
import { HistoryService } from './history.service';
import { decodePuzzleSeed, encodePuzzleSeed, type PuzzleSeedPayload } from './puzzle-seed';
import { WordLengthService } from './word-length.service';
import { WordTierService } from './word-tier.service';
import { isPlayableLetter, isValidGuess, normalizeLetter, pickRandomWord } from './words';

const classicStorageKey = (
  language: GameLanguage,
  length: WordLength,
  difficulty: Difficulty,
  wordTier: WordTier,
): string => `word-play-game-${language}-${length}-${difficulty}-${wordTier}`;

const dailyStorageKey = (language: GameLanguage, length: WordLength, dateKey: string): string =>
  `word-play-game-daily-${language}-${length}-${dateKey}`;

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly wordLengths = inject(WordLengthService);
  private readonly gameLanguages = inject(GameLanguageService);
  private readonly difficulties = inject(DifficultyService);
  private readonly wordTiers = inject(WordTierService);
  private readonly modes = inject(GameModeService);
  private readonly history = inject(HistoryService);
  private readonly state = signal<GameState>(this.loadActive());

  readonly mode = this.modes.mode;
  readonly language = this.gameLanguages.language;
  readonly wordLength = this.wordLengths.wordLength;
  readonly difficulty = computed(() => this.state().difficulty);
  readonly wordTier = computed(() => this.state().wordTier);
  readonly maxAttempts = computed(() => this.state().maxAttempts);
  readonly board = computed(() => this.buildBoard(this.state()));
  readonly keyboard = computed(() => this.state().keyboard);
  readonly status = computed(() => this.state().status);
  readonly currentGuess = computed(() => this.state().currentGuess);
  readonly solution = computed(() => this.state().solution);
  readonly guessesCount = computed(() => this.state().guesses.length);
  readonly isPlaying = computed(() => this.state().status === 'playing');
  readonly canPlayAgain = computed(() => this.modes.mode() === 'classic');
  readonly dailyDate = computed(() => this.state().dailyDate);
  readonly hintsUsed = computed(() => this.state().hintsUsed);
  readonly canUseHint = computed(() => {
    const current = this.state();
    return (
      current.status === 'playing' &&
      current.hintsUsed < MAX_HINTS_PER_GAME &&
      unknownHintLetters(current).length > 0
    );
  });
  /** Classic puzzle seed for the active solution (null in daily mode). */
  readonly puzzleSeed = computed(() => {
    const current = this.state();
    if (current.mode !== 'classic') {
      return null;
    }
    return encodePuzzleSeed({
      language: current.language,
      wordLength: current.wordLength,
      difficulty: current.difficulty,
      wordTier: current.wordTier,
      solution: current.solution,
    });
  });

  activateMode(mode: GameMode): void {
    this.modes.setMode(mode);
    this.state.set(this.loadActive());
  }

  /** Open a classic puzzle from a shareable seed. */
  activateClassicSeed(seed: string): boolean {
    const payload = decodePuzzleSeed(seed);
    if (!payload) {
      return false;
    }

    this.applyPuzzleSettings(payload);
    this.modes.setMode('classic');

    const key = classicStorageKey(
      payload.language,
      payload.wordLength,
      payload.difficulty,
      payload.wordTier,
    );

    const raw =
      localStorage.getItem(key) ??
      legacyRaw(payload.language, payload.wordLength, payload.difficulty, payload.wordTier);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<GameState>;

        const savedSolution =
          typeof parsed.solution === 'string'
            ? [...parsed.solution]
                .map((letter) => normalizeLetter(letter, payload.language))
                .join('')
            : '';
        if (savedSolution === payload.solution) {
          this.state.set(
            this.loadOrCreateClassic(
              payload.language,
              payload.wordLength,
              payload.difficulty,
              payload.wordTier,
            ),
          );
          return true;
        }
      } catch {
        // Fall through and create a fresh seeded game.
      }
    }

    const next = this.createClassicState(
      payload.language,
      payload.wordLength,
      payload.difficulty,
      payload.wordTier,
      payload.solution,
    );
    this.state.set(next);
    this.persist(next);
    return true;
  }

  /** Open a daily puzzle for a calendar date (defaults to settings language/length). */
  activateDailyDate(
    dateKey: string,
    language: GameLanguage = this.gameLanguages.language(),
    length: WordLength = this.wordLengths.wordLength(),
  ): void {
    this.gameLanguages.setLanguage(language);
    this.wordLengths.setWordLength(length);
    this.modes.setMode('daily');
    this.state.set(this.loadOrCreateDaily(language, length, dateKey));
  }

  setLanguage(language: GameLanguage): void {
    if (this.gameLanguages.language() === language) {
      return;
    }
    this.gameLanguages.setLanguage(language);
    this.state.set(this.loadActive());
  }

  setWordLength(length: WordLength): void {
    if (this.wordLengths.wordLength() === length) {
      return;
    }
    this.wordLengths.setWordLength(length);
    this.state.set(this.loadActive());
  }

  setDifficulty(difficulty: Difficulty): void {
    if (this.difficulties.difficulty() === difficulty) {
      return;
    }
    this.difficulties.setDifficulty(difficulty);
    if (this.modes.mode() === 'classic') {
      this.state.set(this.loadActive());
    }
  }

  setWordTier(tier: WordTier): void {
    if (this.wordTiers.wordTier() === tier) {
      return;
    }
    this.wordTiers.setTier(tier);
    if (this.modes.mode() === 'classic') {
      this.state.set(this.loadActive());
    }
  }

  addLetter(letter: string): void {
    const current = this.state();
    const value = normalizeLetter(letter, current.language);
    if (!isPlayableLetter(value, current.language) || !this.isPlaying()) {
      return;
    }

    this.state.update((state) => {
      if (state.currentGuess.length >= state.wordLength) {
        return state;
      }
      return { ...state, currentGuess: `${state.currentGuess}${value}` };
    });
  }

  removeLetter(): void {
    if (!this.isPlaying()) {
      return;
    }

    this.state.update((current) => ({
      ...current,
      currentGuess: current.currentGuess.slice(0, -1),
    }));
  }

  useHint(): 'ok' | 'none-left' | 'finished' | 'no-unknown' {
    const current = this.state();
    if (current.status !== 'playing') {
      return 'finished';
    }
    if (current.hintsUsed >= MAX_HINTS_PER_GAME) {
      return 'none-left';
    }

    const candidates = unknownHintLetters(current);
    if (candidates.length === 0) {
      return 'no-unknown';
    }

    const letter = candidates[Math.floor(Math.random() * candidates.length)];
    const keyboard = markKeyboardPresent(current.keyboard, letter);

    const next: GameState = {
      ...current,
      hintedLetters: [...current.hintedLetters, letter],
      hintsUsed: current.hintsUsed + 1,
      keyboard,
    };

    this.state.set(next);
    this.persist(next);
    return 'ok';
  }

  submitGuess(): 'ok' | 'too-short' | 'invalid' | 'hard-mode' | 'finished' {
    const current = this.state();
    if (current.status !== 'playing') {
      return 'finished';
    }
    if (current.currentGuess.length < current.wordLength) {
      return 'too-short';
    }
    if (!isValidGuess(current.currentGuess, current.wordLength, current.language)) {
      return 'invalid';
    }
    if (
      current.mode === 'classic' &&
      current.difficulty === 'hard' &&
      !satisfiesHardMode(
        current.currentGuess,
        current.guesses,
        current.solution,
        current.hintedLetters,
      )
    ) {
      return 'hard-mode';
    }

    const guess = current.currentGuess;
    const evaluation = evaluateGuess(guess, current.solution);
    const guesses = [...current.guesses, guess];
    const keyboard = mergeKeyboard(current.keyboard, guess, evaluation);
    const status = resolveStatus(guesses, current.solution, current.maxAttempts);

    const next: GameState = {
      ...current,
      guesses,
      currentGuess: '',
      keyboard,
      status,
    };

    this.state.set(next);
    this.persist(next);

    if (status === 'won' || status === 'lost') {
      this.history.record({
        word: current.solution,
        language: current.language,
        length: current.wordLength,
        mode: current.mode,
        difficulty: current.difficulty,
        wordTier: current.wordTier,
        dailyDate: current.dailyDate,
        status,
        attempts: guesses.length,
        hintsUsed: current.hintsUsed,
      });
    }

    return 'ok';
  }

  startNewGame(): void {
    if (this.modes.mode() === 'daily') {
      return;
    }

    const next = this.createClassicState(
      this.gameLanguages.language(),
      this.wordLengths.wordLength(),
      this.difficulties.difficulty(),
      this.wordTiers.wordTier(),
    );
    this.state.set(next);
    this.persist(next);
  }

  private applyPuzzleSettings(payload: PuzzleSeedPayload): void {
    this.gameLanguages.setLanguage(payload.language);
    this.wordLengths.setWordLength(payload.wordLength);
    this.difficulties.setDifficulty(payload.difficulty);
    this.wordTiers.setTier(payload.wordTier);
  }

  private loadActive(): GameState {
    const language = this.gameLanguages.language();
    const length = this.wordLengths.wordLength();
    if (this.modes.mode() === 'daily') {
      return this.loadOrCreateDaily(language, length, dailyDateKey());
    }
    return this.loadOrCreateClassic(
      language,
      length,
      this.difficulties.difficulty(),
      this.wordTiers.wordTier(),
    );
  }

  private buildBoard(state: GameState): Board {
    const rows: Board = [];
    const length = state.wordLength;

    for (let row = 0; row < state.maxAttempts; row++) {
      const guess = state.guesses[row];
      if (guess) {
        const statuses = evaluateGuess(guess, state.solution);
        rows.push(
          guess.split('').map((letter, index): Tile => ({
            letter: letter.toUpperCase(),
            status: statuses[index],
          })),
        );
        continue;
      }

      if (row === state.guesses.length && state.status === 'playing') {
        const letters = state.currentGuess.split('');
        rows.push(
          Array.from({ length }, (_, index): Tile => ({
            letter: (letters[index] ?? '').toUpperCase(),
            status: letters[index] ? 'tbd' : 'empty',
          })),
        );
        continue;
      }

      rows.push(
        Array.from({ length }, (): Tile => ({
          letter: '',
          status: 'empty',
        })),
      );
    }

    return rows;
  }

  private loadOrCreateClassic(
    language: GameLanguage,
    length: WordLength,
    difficulty: Difficulty,
    wordTier: WordTier,
  ): GameState {
    try {
      const raw =
        localStorage.getItem(classicStorageKey(language, length, difficulty, wordTier)) ??
        legacyRaw(language, length, difficulty, wordTier);
      if (!raw) {
        return this.createClassicState(language, length, difficulty, wordTier);
      }

      const parsed = JSON.parse(raw) as Partial<GameState>;
      const parsedLength = isWordLength(parsed.wordLength) ? parsed.wordLength : length;
      const parsedLanguage = isGameLanguage(parsed.language) ? parsed.language : language;
      const parsedDifficulty = isDifficulty(parsed.difficulty) ? parsed.difficulty : difficulty;
      const parsedTier = isWordTier(parsed.wordTier) ? parsed.wordTier : wordTier;
      const maxAttempts = attemptsForDifficulty(difficulty);
      if (
        parsedLength !== length ||
        parsedLanguage !== language ||
        parsedDifficulty !== difficulty ||
        parsedTier !== wordTier ||
        typeof parsed.solution !== 'string' ||
        parsed.solution.length !== length ||
        !Array.isArray(parsed.guesses) ||
        parsed.guesses.length > maxAttempts
      ) {
        return this.createClassicState(language, length, difficulty, wordTier);
      }

      const status =
        parsed.status === 'won' || parsed.status === 'lost' ? parsed.status : 'playing';

      const solution = [...parsed.solution]
        .map((letter) => normalizeLetter(letter, language))
        .join('');

      const used = this.history.usedWords(length, language);

      if (status === 'playing' && used.has(solution)) {
        return this.createClassicState(language, length, difficulty, wordTier);
      }

      const hints = normalizeHints(parsed, solution, language);

      if (status === 'won' || status === 'lost') {
        this.history.record({
          word: solution,
          language,
          length,
          mode: 'classic',
          difficulty,
          wordTier,
          status,
          attempts: parsed.guesses.length,
          hintsUsed: hints.hintsUsed,
        });
      }

      return {
        mode: 'classic',
        language,
        wordLength: length,
        difficulty,
        wordTier,
        maxAttempts,
        solution,
        guesses: parsed.guesses.map((guess) =>
          [...(typeof guess === 'string' ? guess : '')]
            .map((letter) => normalizeLetter(letter, language))
            .join(''),
        ),
        currentGuess:
          status === 'playing'
            ? [...(parsed.currentGuess ?? '')]
                .map((letter) => normalizeLetter(letter, language))
                .join('')
            : '',
        status,
        keyboard: parsed.keyboard ?? {},
        hintedLetters: hints.hintedLetters,
        hintsUsed: hints.hintsUsed,
      };
    } catch {
      return this.createClassicState(language, length, difficulty, wordTier);
    }
  }

  private loadOrCreateDaily(
    language: GameLanguage,
    length: WordLength,
    dateKey: string,
  ): GameState {
    const difficulty = DAILY_DIFFICULTY;
    const wordTier = DAILY_WORD_TIER;
    const maxAttempts = attemptsForDifficulty(difficulty);
    const expected = pickDailyWord(dateKey, language, length);

    try {
      const raw = localStorage.getItem(dailyStorageKey(language, length, dateKey));
      if (!raw) {
        return this.createDailyState(language, length, dateKey);
      }

      const parsed = JSON.parse(raw) as Partial<GameState>;
      if (
        !isWordLength(parsed.wordLength) ||
        parsed.wordLength !== length ||
        !isGameLanguage(parsed.language) ||
        parsed.language !== language ||
        parsed.dailyDate !== dateKey ||
        typeof parsed.solution !== 'string' ||
        parsed.solution.length !== length ||
        !Array.isArray(parsed.guesses) ||
        parsed.guesses.length > maxAttempts
      ) {
        return this.createDailyState(language, length, dateKey);
      }

      const solution = [...parsed.solution]
        .map((letter) => normalizeLetter(letter, language))
        .join('');

      if (solution !== expected) {
        return this.createDailyState(language, length, dateKey);
      }

      const status =
        parsed.status === 'won' || parsed.status === 'lost' ? parsed.status : 'playing';

      const hints = normalizeHints(parsed, solution, language);

      if (status === 'won' || status === 'lost') {
        this.history.record({
          word: solution,
          language,
          length,
          mode: 'daily',
          difficulty,
          wordTier,
          dailyDate: dateKey,
          status,
          attempts: parsed.guesses.length,
          hintsUsed: hints.hintsUsed,
        });
      }

      return {
        mode: 'daily',
        language,
        wordLength: length,
        difficulty,
        wordTier,
        dailyDate: dateKey,
        maxAttempts,
        solution,
        guesses: parsed.guesses.map((guess) =>
          [...(typeof guess === 'string' ? guess : '')]
            .map((letter) => normalizeLetter(letter, language))
            .join(''),
        ),
        currentGuess:
          status === 'playing'
            ? [...(parsed.currentGuess ?? '')]
                .map((letter) => normalizeLetter(letter, language))
                .join('')
            : '',
        status,
        keyboard: parsed.keyboard ?? {},
        hintedLetters: hints.hintedLetters,
        hintsUsed: hints.hintsUsed,
      };
    } catch {
      return this.createDailyState(language, length, dateKey);
    }
  }

  private createClassicState(
    language: GameLanguage,
    length: WordLength,
    difficulty: Difficulty,
    wordTier: WordTier,
    solution?: string,
  ): GameState {
    const normalizedSolution = solution
      ? [...solution].map((letter) => normalizeLetter(letter, language)).join('')
      : pickRandomWord(length, language, this.history.usedWords(length, language), wordTier);

    return {
      mode: 'classic',
      language,
      wordLength: length,
      difficulty,
      wordTier,
      maxAttempts: attemptsForDifficulty(difficulty),
      solution: normalizedSolution,
      guesses: [],
      currentGuess: '',
      status: 'playing',
      keyboard: {},
      hintedLetters: [],
      hintsUsed: 0,
    };
  }

  private createDailyState(language: GameLanguage, length: WordLength, dateKey: string): GameState {
    return {
      mode: 'daily',
      language,
      wordLength: length,
      difficulty: DAILY_DIFFICULTY,
      wordTier: DAILY_WORD_TIER,
      dailyDate: dateKey,
      maxAttempts: attemptsForDifficulty(DAILY_DIFFICULTY),
      solution: pickDailyWord(dateKey, language, length),
      guesses: [],
      currentGuess: '',
      status: 'playing',
      keyboard: {},
      hintedLetters: [],
      hintsUsed: 0,
    };
  }

  private persist(state: GameState): void {
    if (state.mode === 'daily' && state.dailyDate) {
      localStorage.setItem(
        dailyStorageKey(state.language, state.wordLength, state.dailyDate),
        JSON.stringify(state),
      );
      return;
    }

    localStorage.setItem(
      classicStorageKey(state.language, state.wordLength, state.difficulty, state.wordTier),
      JSON.stringify(state),
    );
  }
}

function legacyRaw(
  language: GameLanguage,
  length: WordLength,
  difficulty: Difficulty,
  wordTier: WordTier,
): string | null {
  // Older saves omit the word-tier segment and match the default medium dictionary.
  if (wordTier !== 'medium') {
    return null;
  }

  return (
    localStorage.getItem(`word-play-game-${language}-${length}-${difficulty}`) ??
    (difficulty === 'normal'
      ? (localStorage.getItem(`word-play-game-${language}-${length}`) ??
        (language === 'en' ? localStorage.getItem(`word-play-game-${length}`) : null))
      : null)
  );
}

export function evaluateGuess(guess: string, solution: string): LetterStatus[] {
  const length = solution.length;
  const result: LetterStatus[] = Array.from({ length }, () => 'absent');
  const remaining = solution.split('');

  for (let i = 0; i < length; i++) {
    if (guess[i] === solution[i]) {
      result[i] = 'correct';
      remaining[i] = '';
    }
  }

  for (let i = 0; i < length; i++) {
    if (result[i] === 'correct') {
      continue;
    }
    const index = remaining.indexOf(guess[i]);
    if (index !== -1) {
      result[i] = 'present';
      remaining[index] = '';
    }
  }

  return result;
}

export function satisfiesHardMode(
  guess: string,
  previousGuesses: string[],
  solution: string,
  hintedLetters: readonly string[] = [],
): boolean {
  for (const letter of hintedLetters) {
    if (!guess.includes(letter)) {
      return false;
    }
  }

  for (const previous of previousGuesses) {
    const evaluation = evaluateGuess(previous, solution);
    const required = guess.split('');

    for (let i = 0; i < previous.length; i++) {
      if (evaluation[i] === 'correct' && guess[i] !== previous[i]) {
        return false;
      }
    }

    for (let i = 0; i < previous.length; i++) {
      if (evaluation[i] !== 'present') {
        continue;
      }
      const letter = previous[i];
      const index = required.indexOf(letter);
      if (index === -1) {
        return false;
      }
      required[index] = '';
    }
  }

  return true;
}

/** Letters that are in the solution but not yet marked present/correct on the keyboard. */
function unknownHintLetters(state: GameState): string[] {
  const hinted = new Set(state.hintedLetters);
  const unique = [...new Set(state.solution.split(''))];
  return unique.filter((letter) => {
    if (hinted.has(letter)) {
      return false;
    }
    const status = state.keyboard[letter];
    return status !== 'correct' && status !== 'present';
  });
}

function markKeyboardPresent(
  keyboard: Record<string, KeyStatus>,
  letter: string,
): Record<string, KeyStatus> {
  const previous = keyboard[letter];
  if (previous === 'correct') {
    return keyboard;
  }
  return { ...keyboard, [letter]: 'present' };
}

function normalizeHints(
  parsed: Partial<GameState> & { hintedPositions?: unknown },
  solution: string,
  language: GameLanguage,
): { hintedLetters: string[]; hintsUsed: number } {
  const fromLetters = Array.isArray(parsed.hintedLetters)
    ? parsed.hintedLetters
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
        .map((letter) => normalizeLetter(letter, language))
    : [];

  const legacyPositions = Array.isArray(parsed.hintedPositions)
    ? parsed.hintedPositions.filter(
        (value): value is number =>
          Number.isInteger(value) && value >= 0 && value < solution.length,
      )
    : [];

  const fromLegacy = legacyPositions
    .map((index) => solution[index])
    .filter((letter): letter is string => typeof letter === 'string' && letter.length > 0);

  const hintedLetters = [...new Set([...fromLetters, ...fromLegacy])]
    .filter((letter) => solution.includes(letter))
    .slice(0, MAX_HINTS_PER_GAME);

  const counted =
    typeof parsed.hintsUsed === 'number' &&
    Number.isFinite(parsed.hintsUsed) &&
    parsed.hintsUsed > 0
      ? Math.floor(parsed.hintsUsed)
      : 0;

  const hintsUsed = Math.min(MAX_HINTS_PER_GAME, Math.max(counted, hintedLetters.length));

  return { hintedLetters, hintsUsed };
}

function mergeKeyboard(
  keyboard: Record<string, KeyStatus>,
  guess: string,
  evaluation: LetterStatus[],
): Record<string, KeyStatus> {
  const next = { ...keyboard };
  const rank: Record<KeyStatus, number> = { absent: 1, present: 2, correct: 3 };

  for (let i = 0; i < guess.length; i++) {
    const letter = guess[i];
    const status = evaluation[i] as KeyStatus;
    const previous = next[letter];
    if (!previous || rank[status] > rank[previous]) {
      next[letter] = status;
    }
  }

  return next;
}

function resolveStatus(guesses: string[], solution: string, maxAttempts: number): GameStatus {
  if (guesses[guesses.length - 1] === solution) {
    return 'won';
  }
  if (guesses.length >= maxAttempts) {
    return 'lost';
  }
  return 'playing';
}
