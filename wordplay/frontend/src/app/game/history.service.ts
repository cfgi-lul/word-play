import { computed, Injectable, signal } from '@angular/core';

import {
  DIFFICULTY_ATTEMPTS,
  type GameLanguage,
  type GameStatus,
  isGameLanguage,
  isWordLength,
  type WordLength,
} from './game.types';

export interface HistoryEntry {
  word: string;
  language: GameLanguage;
  length: WordLength;
  status: Exclude<GameStatus, 'playing'>;
  attempts: number;
  finishedAt: string;
}

export interface AttemptBucket {
  attempts: number;
  count: number;
  /** 0–100 share among wins */
  share: number;
}

export interface GameStats {
  played: number;
  wins: number;
  losses: number;
  winRate: number;
  lossRate: number;
  currentWinStreak: number;
  maxWinStreak: number;
  attemptDistribution: readonly AttemptBucket[];
}

const STORAGE_KEY = 'word-play-history';
const DISTRIBUTION_MAX_ATTEMPTS = DIFFICULTY_ATTEMPTS.easy;

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private readonly entries = signal<HistoryEntry[]>(this.read());

  readonly all = this.entries.asReadonly();
  readonly count = computed(() => this.entries().length);
  readonly stats = computed(() => computeGameStats(this.entries()));

  usedWords(length: WordLength, language: GameLanguage): ReadonlySet<string> {
    return new Set(
      this.entries()
        .filter((entry) => entry.length === length && entry.language === language)
        .map((entry) => entry.word),
    );
  }

  record(entry: Omit<HistoryEntry, 'finishedAt'>): void {
    const word = entry.word.toLowerCase();

    const next: HistoryEntry = {
      ...entry,
      word,
      finishedAt: new Date().toISOString(),
    };

    this.entries.update((current) => {
      if (
        current.some(
          (item) =>
            item.word === word && item.length === entry.length && item.language === entry.language,
        )
      ) {
        return current;
      }
      return [next, ...current];
    });
    this.persist();
  }

  private read(): HistoryEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map((item): HistoryEntry | null => {
          if (!item || typeof item !== 'object') {
            return null;
          }
          const entry = item as Partial<HistoryEntry>;
          const language = isGameLanguage(entry.language) ? entry.language : 'en';
          if (
            typeof entry.word !== 'string' ||
            !isWordLength(entry.length) ||
            (entry.status !== 'won' && entry.status !== 'lost') ||
            typeof entry.attempts !== 'number' ||
            typeof entry.finishedAt !== 'string'
          ) {
            return null;
          }
          return {
            word: entry.word.toLowerCase(),
            language,
            length: entry.length,
            status: entry.status,
            attempts: entry.attempts,
            finishedAt: entry.finishedAt,
          };
        })
        .filter((entry): entry is HistoryEntry => entry !== null);
    } catch {
      return [];
    }
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries()));
  }
}

export function computeGameStats(entries: readonly HistoryEntry[]): GameStats {
  const played = entries.length;
  const wins = entries.filter((entry) => entry.status === 'won').length;
  const losses = played - wins;
  const winRate = played === 0 ? 0 : Math.round((wins / played) * 100);
  const lossRate = played === 0 ? 0 : 100 - winRate;
  const chronological = [...entries].sort((a, b) => a.finishedAt.localeCompare(b.finishedAt));
  let currentWinStreak = 0;
  let maxWinStreak = 0;
  let running = 0;

  for (const entry of chronological) {
    if (entry.status === 'won') {
      running += 1;
      maxWinStreak = Math.max(maxWinStreak, running);
    } else {
      running = 0;
    }
  }

  for (let i = chronological.length - 1; i >= 0; i--) {
    if (chronological.at(i)?.status !== 'won') {
      break;
    }
    currentWinStreak += 1;
  }

  const counts = Array.from({ length: DISTRIBUTION_MAX_ATTEMPTS }, () => 0);
  for (const entry of entries) {
    if (entry.status !== 'won') {
      continue;
    }
    const index = entry.attempts - 1;
    if (index >= 0 && index < counts.length) {
      counts[index] += 1;
    }
  }

  const attemptDistribution = counts.map((count, index): AttemptBucket => ({
    attempts: index + 1,
    count,
    share: wins === 0 ? 0 : Math.round((count / wins) * 100),
  }));

  return {
    played,
    wins,
    losses,
    winRate,
    lossRate,
    currentWinStreak,
    maxWinStreak,
    attemptDistribution,
  };
}
