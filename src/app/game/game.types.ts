import { type AppLocale } from '../i18n/translations';

export type WordLength = 4 | 5 | 6 | 7;
export type GameLanguage = AppLocale;

export const WORD_LENGTHS: readonly WordLength[] = [4, 5, 6, 7];
export const DEFAULT_WORD_LENGTH: WordLength = 5;
export const MAX_ATTEMPTS = 6;

export type LetterStatus = 'empty' | 'tbd' | 'correct' | 'present' | 'absent';

export type GameStatus = 'playing' | 'won' | 'lost';

export interface Tile {
  letter: string;
  status: LetterStatus;
}

export type Board = Tile[][];

export type KeyStatus = Exclude<LetterStatus, 'empty' | 'tbd'>;

export interface GameState {
  language: GameLanguage;
  wordLength: WordLength;
  solution: string;
  guesses: string[];
  currentGuess: string;
  status: GameStatus;
  keyboard: Record<string, KeyStatus>;
}

export function isGameLanguage(value: unknown): value is GameLanguage {
  return value === 'en' || value === 'ru';
}

export function isWordLength(value: unknown): value is WordLength {
  return value === 4 || value === 5 || value === 6 || value === 7;
}
