import { type GameLanguage, type WordLength } from './game.types';
import { pickDailyAnswer } from './words';

/** Local calendar date as `YYYY-MM-DD`. */
export function dailyDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** FNV-1a style hash → stable index in `[0, modulo)`. */
export function seededIndex(seed: string, modulo: number): number {
  if (modulo <= 0) {
    return 0;
  }

  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash) % modulo;
}

export function dailySeed(dateKey: string, language: GameLanguage, length: WordLength): string {
  return `word-play-daily|${language}|${length}|${dateKey}`;
}

export function pickDailyWord(dateKey: string, language: GameLanguage, length: WordLength): string {
  return pickDailyAnswer(language, length, dailySeed(dateKey, language, length));
}
