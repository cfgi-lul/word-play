import { Injectable, signal } from '@angular/core';

import { DEFAULT_WORD_LENGTH, isWordLength, type WordLength } from './game.types';

const STORAGE_KEY = 'word-play-word-length';

@Injectable({ providedIn: 'root' })
export class WordLengthService {
  private readonly mode = signal<WordLength>(this.readInitial());

  readonly wordLength = this.mode.asReadonly();

  setWordLength(length: WordLength): void {
    this.mode.set(length);
    localStorage.setItem(STORAGE_KEY, String(length));
  }

  private readInitial(): WordLength {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    return isWordLength(stored) ? stored : DEFAULT_WORD_LENGTH;
  }
}
