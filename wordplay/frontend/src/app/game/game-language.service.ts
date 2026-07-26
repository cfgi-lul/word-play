import { Injectable, signal } from '@angular/core';

import { type GameLanguage, isGameLanguage } from './game.types';

const STORAGE_KEY = 'word-play-game-language';

@Injectable({ providedIn: 'root' })
export class GameLanguageService {
  private readonly mode = signal<GameLanguage>(this.readInitial());

  readonly language = this.mode.asReadonly();

  setLanguage(language: GameLanguage): void {
    this.mode.set(language);
    localStorage.setItem(STORAGE_KEY, language);
  }

  private readInitial(): GameLanguage {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isGameLanguage(stored) ? stored : 'en';
  }
}
