import { Injectable, signal } from '@angular/core';

import { DEFAULT_DIFFICULTY, isDifficulty, type Difficulty } from './game.types';

const STORAGE_KEY = 'word-play-difficulty';

@Injectable({ providedIn: 'root' })
export class DifficultyService {
  private readonly mode = signal<Difficulty>(this.readInitial());

  readonly difficulty = this.mode.asReadonly();

  setDifficulty(difficulty: Difficulty): void {
    this.mode.set(difficulty);
    localStorage.setItem(STORAGE_KEY, difficulty);
  }

  private readInitial(): Difficulty {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isDifficulty(stored) ? stored : DEFAULT_DIFFICULTY;
  }
}
