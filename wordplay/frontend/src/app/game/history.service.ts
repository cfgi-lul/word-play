import { computed, inject, Injectable, signal } from '@angular/core';

import { DifficultyService } from './difficulty.service';
import {
  attemptsForDifficulty,
  DEFAULT_DIFFICULTY,
  DEFAULT_WORD_TIER,
  type Difficulty,
  type GameLanguage,
  type GameStatus,
  isDifficulty,
  isGameLanguage,
  isWordLength,
  isWordTier,
  type WordLength,
  type WordTier,
} from './game.types';
import { WordTierService } from './word-tier.service';

export interface HistoryEntry {
  word: string;
  language: GameLanguage;
  length: WordLength;
  difficulty: Difficulty;
  wordTier: WordTier;
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

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private readonly difficulties = inject(DifficultyService);
  private readonly wordTiers = inject(WordTierService);
  private readonly entries = signal<HistoryEntry[]>(this.read());

  readonly all = this.entries.asReadonly();
  readonly count = computed(() => this.entries().length);

  /** Finished games for the currently selected attempts mode + dictionary tier. */
  readonly forCurrentMode = computed(() => {
    const difficulty = this.difficulties.difficulty();
    const wordTier = this.wordTiers.wordTier();
    return this.entries().filter(
      (entry) => entry.difficulty === difficulty && entry.wordTier === wordTier,
    );
  });

  readonly stats = computed(() =>
    computeGameStats(this.forCurrentMode(), attemptsForDifficulty(this.difficulties.difficulty())),
  );

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
            item.word === word &&
            item.length === entry.length &&
            item.language === entry.language &&
            item.difficulty === entry.difficulty &&
            item.wordTier === entry.wordTier,
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
          const difficulty = isDifficulty(entry.difficulty) ? entry.difficulty : DEFAULT_DIFFICULTY;
          const wordTier = isWordTier(entry.wordTier) ? entry.wordTier : DEFAULT_WORD_TIER;
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
            difficulty,
            wordTier,
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

export function computeGameStats(
  entries: readonly HistoryEntry[],
  maxAttempts = attemptsForDifficulty('easy'),
): GameStats {
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

  const counts = Array.from({ length: maxAttempts }, () => 0);
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
