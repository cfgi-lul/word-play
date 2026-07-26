import { Injectable, signal } from '@angular/core';

import { type AppScreen } from '../game/game.types';

@Injectable({ providedIn: 'root' })
export class NavigationService {
  private readonly screenSignal = signal<AppScreen>('home');

  readonly screen = this.screenSignal.asReadonly();

  goHome(): void {
    this.screenSignal.set('home');
  }

  openGame(): void {
    this.screenSignal.set('game');
  }

  openStats(): void {
    this.screenSignal.set('stats');
  }
}
