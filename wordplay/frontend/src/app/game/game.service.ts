import { computed, inject, Injectable, signal } from '@angular/core';

import { DifficultyService } from './difficulty.service';
import {
  attemptsForDifficulty,
  type Board,
  type Difficulty,
  type GameLanguage,
  type GameState,
  type GameStatus,
  isDifficulty,
  isGameLanguage,
  isWordLength,
  type KeyStatus,
  type LetterStatus,
  type Tile,
  type WordLength,
} from './game.types';
import { GameLanguageService } from './game-language.service';
import { HistoryService } from './history.service';
import { WordLengthService } from './word-length.service';
import { isPlayableLetter, isValidGuess, normalizeLetter, pickRandomWord } from './words';

const storageKey = (language: GameLanguage, length: WordLength, difficulty: Difficulty): string =>
  `word-play-game-${language}-${length}-${difficulty}`;

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly wordLengths = inject(WordLengthService);
  private readonly gameLanguages = inject(GameLanguageService);
  private readonly difficulties = inject(DifficultyService);
  private readonly history = inject(HistoryService);
  private readonly state = signal<GameState>(
    this.loadOrCreate(
      this.gameLanguages.language(),
      this.wordLengths.wordLength(),
      this.difficulties.difficulty(),
    ),
  );

  readonly language = this.gameLanguages.language;
  readonly wordLength = this.wordLengths.wordLength;
  readonly difficulty = this.difficulties.difficulty;
  readonly maxAttempts = computed(() => this.state().maxAttempts);
  readonly board = computed(() => this.buildBoard(this.state()));
  readonly keyboard = computed(() => this.state().keyboard);
  readonly status = computed(() => this.state().status);
  readonly currentGuess = computed(() => this.state().currentGuess);
  readonly solution = computed(() => this.state().solution);
  readonly guessesCount = computed(() => this.state().guesses.length);
  readonly isPlaying = computed(() => this.state().status === 'playing');

  setLanguage(language: GameLanguage): void {
    if (this.gameLanguages.language() === language) {
      return;
    }
    this.gameLanguages.setLanguage(language);
    this.state.set(
      this.loadOrCreate(language, this.wordLengths.wordLength(), this.difficulties.difficulty()),
    );
  }

  setWordLength(length: WordLength): void {
    if (this.wordLengths.wordLength() === length) {
      return;
    }
    this.wordLengths.setWordLength(length);
    this.state.set(
      this.loadOrCreate(this.gameLanguages.language(), length, this.difficulties.difficulty()),
    );
  }

  setDifficulty(difficulty: Difficulty): void {
    if (this.difficulties.difficulty() === difficulty) {
      return;
    }
    this.difficulties.setDifficulty(difficulty);
    this.state.set(
      this.loadOrCreate(this.gameLanguages.language(), this.wordLengths.wordLength(), difficulty),
    );
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
      current.difficulty === 'hard' &&
      !satisfiesHardMode(current.currentGuess, current.guesses, current.solution)
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
        status,
        attempts: guesses.length,
      });
    }

    return 'ok';
  }

  startNewGame(): void {
    const next = this.createFreshState(
      this.gameLanguages.language(),
      this.wordLengths.wordLength(),
      this.difficulties.difficulty(),
    );
    this.state.set(next);
    this.persist(next);
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

  private loadOrCreate(
    language: GameLanguage,
    length: WordLength,
    difficulty: Difficulty,
  ): GameState {
    try {
      const raw =
        localStorage.getItem(storageKey(language, length, difficulty)) ??
        legacyRaw(language, length, difficulty);
      if (!raw) {
        return this.createFreshState(language, length, difficulty);
      }

      const parsed = JSON.parse(raw) as Partial<GameState>;
      const parsedLength = isWordLength(parsed.wordLength) ? parsed.wordLength : length;
      const parsedLanguage = isGameLanguage(parsed.language) ? parsed.language : language;
      const parsedDifficulty = isDifficulty(parsed.difficulty) ? parsed.difficulty : difficulty;
      const maxAttempts = attemptsForDifficulty(difficulty);
      if (
        parsedLength !== length ||
        parsedLanguage !== language ||
        parsedDifficulty !== difficulty ||
        typeof parsed.solution !== 'string' ||
        parsed.solution.length !== length ||
        !Array.isArray(parsed.guesses) ||
        parsed.guesses.length > maxAttempts
      ) {
        return this.createFreshState(language, length, difficulty);
      }

      const status =
        parsed.status === 'won' || parsed.status === 'lost' ? parsed.status : 'playing';

      const solution = [...parsed.solution]
        .map((letter) => normalizeLetter(letter, language))
        .join('');

      const used = this.history.usedWords(length, language);

      if (status === 'playing' && used.has(solution)) {
        return this.createFreshState(language, length, difficulty);
      }

      if (status === 'won' || status === 'lost') {
        this.history.record({
          word: solution,
          language,
          length,
          status,
          attempts: parsed.guesses.length,
        });
      }

      return {
        language,
        wordLength: length,
        difficulty,
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
      };
    } catch {
      return this.createFreshState(language, length, difficulty);
    }
  }

  private createFreshState(
    language: GameLanguage,
    length: WordLength,
    difficulty: Difficulty,
  ): GameState {
    return {
      language,
      wordLength: length,
      difficulty,
      maxAttempts: attemptsForDifficulty(difficulty),
      solution: pickRandomWord(length, language, this.history.usedWords(length, language)),
      guesses: [],
      currentGuess: '',
      status: 'playing',
      keyboard: {},
    };
  }

  private persist(state: GameState): void {
    localStorage.setItem(
      storageKey(state.language, state.wordLength, state.difficulty),
      JSON.stringify(state),
    );
  }
}

function legacyRaw(
  language: GameLanguage,
  length: WordLength,
  difficulty: Difficulty,
): string | null {
  // Older saves had no difficulty segment and match the default (normal) mode.
  if (difficulty !== 'normal') {
    return null;
  }

  return (
    localStorage.getItem(`word-play-game-${language}-${length}`) ??
    (language === 'en' ? localStorage.getItem(`word-play-game-${length}`) : null)
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
): boolean {
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
