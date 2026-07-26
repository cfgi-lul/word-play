import { type AppLocale } from '../i18n/translations';

export type WordLength = 4 | 5 | 6 | 7;
export type GameLanguage = AppLocale;
export type Difficulty = 'easy' | 'normal' | 'hard';
export type WordTier = 'easy' | 'medium' | 'hard';
export type GameMode = 'classic' | 'daily';

export const WORD_LENGTHS: readonly WordLength[] = [4, 5, 6, 7];
export const DEFAULT_WORD_LENGTH: WordLength = 5;
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];
export const DEFAULT_DIFFICULTY: Difficulty = 'normal';
export const WORD_TIERS: readonly WordTier[] = ['easy', 'medium', 'hard'];
export const DEFAULT_WORD_TIER: WordTier = 'medium';
export const DAILY_DIFFICULTY: Difficulty = 'normal';
export const DAILY_WORD_TIER: WordTier = 'medium';

/** Player-requested letter reveals allowed per game. */
export const MAX_HINTS_PER_GAME = 1;

export const DIFFICULTY_ATTEMPTS: Record<Difficulty, number> = {
  easy: 8,
  normal: 6,
  hard: 5,
};

export function attemptsForDifficulty(difficulty: Difficulty): number {
  return DIFFICULTY_ATTEMPTS[difficulty];
}

export type LetterStatus = 'empty' | 'tbd' | 'correct' | 'present' | 'absent';

export type GameStatus = 'playing' | 'won' | 'lost';

export interface Tile {
  letter: string;
  status: LetterStatus;
}

export type Board = Tile[][];

export type KeyStatus = Exclude<LetterStatus, 'empty' | 'tbd'>;

export interface GameState {
  mode: GameMode;
  language: GameLanguage;
  wordLength: WordLength;
  difficulty: Difficulty;
  wordTier: WordTier;
  /** Local calendar date `YYYY-MM-DD` for daily puzzles. */
  dailyDate?: string;
  maxAttempts: number;
  solution: string;
  guesses: string[];
  currentGuess: string;
  status: GameStatus;
  keyboard: Record<string, KeyStatus>;
  /** 0-based solution indexes revealed via a player hint. */
  hintedPositions: number[];
  /** How many player hints were used in this game. */
  hintsUsed: number;
}

export function isGameLanguage(value: unknown): value is GameLanguage {
  return value === 'en' || value === 'ru';
}

export function isWordLength(value: unknown): value is WordLength {
  return value === 4 || value === 5 || value === 6 || value === 7;
}

export function isDifficulty(value: unknown): value is Difficulty {
  return value === 'easy' || value === 'normal' || value === 'hard';
}

export function isWordTier(value: unknown): value is WordTier {
  return value === 'easy' || value === 'medium' || value === 'hard';
}

export function isGameMode(value: unknown): value is GameMode {
  return value === 'classic' || value === 'daily';
}
