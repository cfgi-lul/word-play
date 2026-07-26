import { Injectable, computed, signal } from '@angular/core';

import {
  type GameLanguage,
  type GameStatus,
  type WordLength,
  isGameLanguage,
  isWordLength,
} from './game.types';

export interface HistoryEntry {
  word: string;
  language: GameLanguage;
  length: WordLength;
  status: Exclude<GameStatus, 'playing'>;
  attempts: number;
  finishedAt: string;
}

const STORAGE_KEY = 'word-play-history';

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private readonly entries = signal<HistoryEntry[]>(this.read());

  readonly all = this.entries.asReadonly();
  readonly count = computed(() => this.entries().length);

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
            item.language === entry.language,
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
