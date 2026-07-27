import { computed, inject, Injectable, signal } from '@angular/core';

import { DifficultyService } from './difficulty.service';
import {
  attemptsForDifficulty,
  DAILY_DIFFICULTY,
  DEFAULT_DIFFICULTY,
  DEFAULT_WORD_TIER,
  type Difficulty,
  type GameLanguage,
  type GameMode,
  type GameStatus,
  isDifficulty,
  isGameLanguage,
  isGameMode,
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
  mode: GameMode;
  difficulty: Difficulty;
  wordTier: WordTier;
  dailyDate?: string;
  status: Exclude<GameStatus, 'playing'>;
  attempts: number;
  hintsUsed: number;
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
  gamesWithHints: number;
  attemptDistribution: readonly AttemptBucket[];
}

const STORAGE_KEY = 'word-play-history';

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private readonly difficulties = inject(DifficultyService);
  private readonly wordTiers = inject(WordTierService);
  private readonly entries = signal<HistoryEntry[]>(this.read());
  private readonly statsModeSignal = signal<GameMode>('classic');

  readonly all = this.entries.asReadonly();
  readonly count = computed(() => this.entries().length);
  readonly statsMode = this.statsModeSignal.asReadonly();

  readonly forStatsMode = computed(() => this.entriesFor(this.statsModeSignal()));

  readonly stats = computed(() => {
    const mode = this.statsModeSignal();

    const maxAttempts =
      mode === 'daily'
        ? attemptsForDifficulty(DAILY_DIFFICULTY)
        : attemptsForDifficulty(this.difficulties.difficulty());
    return computeGameStats(this.entriesFor(mode), maxAttempts);
  });

  setStatsMode(mode: GameMode): void {
    this.statsModeSignal.set(mode);
  }

  entriesFor(mode: GameMode): HistoryEntry[] {
    if (mode === 'daily') {
      return this.entries().filter((entry) => entry.mode === 'daily');
    }

    const difficulty = this.difficulties.difficulty();
    const wordTier = this.wordTiers.wordTier();
    return this.entries().filter(
      (entry) =>
        entry.mode === 'classic' && entry.difficulty === difficulty && entry.wordTier === wordTier,
    );
  }

  usedWords(
    length: WordLength,
    language: GameLanguage,
    difficulty: Difficulty,
    wordTier: WordTier,
  ): ReadonlySet<string> {
    return new Set(
      this.entries()
        .filter(
          (entry) =>
            entry.mode === 'classic' &&
            entry.length === length &&
            entry.language === language &&
            entry.difficulty === difficulty &&
            entry.wordTier === wordTier,
        )
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
      if (current.some((item) => isSameRecord(item, next))) {
        return current;
      }
      return [next, ...current];
    });
    this.persist();
  }

  /** Clears finished games for the currently viewed stats scope. */
  clearCurrentStats(): void {
    const mode = this.statsModeSignal();
    if (mode === 'daily') {
      this.entries.update((current) => current.filter((entry) => entry.mode !== 'daily'));
    } else {
      const difficulty = this.difficulties.difficulty();
      const wordTier = this.wordTiers.wordTier();
      this.entries.update((current) =>
        current.filter(
          (entry) =>
            entry.mode !== 'classic' ||
            entry.difficulty !== difficulty ||
            entry.wordTier !== wordTier,
        ),
      );
    }
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
          const mode = isGameMode(entry.mode) ? entry.mode : 'classic';

          const dailyDate =
            typeof entry.dailyDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry.dailyDate)
              ? entry.dailyDate
              : undefined;
          if (
            typeof entry.word !== 'string' ||
            !isWordLength(entry.length) ||
            (entry.status !== 'won' && entry.status !== 'lost') ||
            typeof entry.attempts !== 'number' ||
            typeof entry.finishedAt !== 'string'
          ) {
            return null;
          }
          const hintsUsed =
            typeof entry.hintsUsed === 'number' &&
            Number.isFinite(entry.hintsUsed) &&
            entry.hintsUsed > 0
              ? Math.floor(entry.hintsUsed)
              : 0;

          return {
            word: entry.word.toLowerCase(),
            language,
            length: entry.length,
            mode,
            difficulty,
            wordTier,
            dailyDate,
            status: entry.status,
            attempts: entry.attempts,
            hintsUsed,
            finishedAt: entry.finishedAt,
          };
        })
        .filter((entry): entry is HistoryEntry => entry !== null);
    } catch {
      return [];
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries()));
    } catch {
      // QuotaExceeded / private mode — keep in-memory history only.
    }
  }
}

function isSameRecord(item: HistoryEntry, next: HistoryEntry): boolean {
  if (next.mode === 'daily') {
    return (
      item.mode === 'daily' &&
      item.language === next.language &&
      item.length === next.length &&
      item.dailyDate === next.dailyDate
    );
  }

  return (
    item.mode === 'classic' &&
    item.word === next.word &&
    item.length === next.length &&
    item.language === next.language &&
    item.difficulty === next.difficulty &&
    item.wordTier === next.wordTier
  );
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

  const gamesWithHints = entries.filter((entry) => entry.hintsUsed > 0).length;

  return {
    played,
    wins,
    losses,
    winRate,
    lossRate,
    currentWinStreak,
    maxWinStreak,
    gamesWithHints,
    attemptDistribution,
  };
}
