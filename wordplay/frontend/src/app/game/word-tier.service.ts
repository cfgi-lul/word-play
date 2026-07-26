import { Injectable, signal } from '@angular/core';

import { DEFAULT_WORD_TIER, isWordTier, type WordTier } from './game.types';

const STORAGE_KEY = 'word-play-word-tier';

@Injectable({ providedIn: 'root' })
export class WordTierService {
  private readonly mode = signal<WordTier>(this.readInitial());

  readonly wordTier = this.mode.asReadonly();

  setTier(tier: WordTier): void {
    this.mode.set(tier);
    localStorage.setItem(STORAGE_KEY, tier);
  }

  private readInitial(): WordTier {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isWordTier(stored) ? stored : DEFAULT_WORD_TIER;
  }
}
