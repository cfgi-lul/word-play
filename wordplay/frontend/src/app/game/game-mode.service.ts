import { Injectable, signal } from '@angular/core';

import { type GameMode, isGameMode } from './game.types';

const STORAGE_KEY = 'word-play-game-mode';

@Injectable({ providedIn: 'root' })
export class GameModeService {
  private readonly modeSignal = signal<GameMode>(this.readInitial());

  readonly mode = this.modeSignal.asReadonly();

  setMode(mode: GameMode): void {
    this.modeSignal.set(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }

  private readInitial(): GameMode {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isGameMode(stored) ? stored : 'classic';
  }
}
