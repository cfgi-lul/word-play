import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { dailyDateKey } from '../game/daily-word';
import { type GameLanguage, type WordLength } from '../game/game.types';

@Injectable({ providedIn: 'root' })
export class NavigationService {
  private readonly router = inject(Router);

  goHome(): void {
    void this.router.navigateByUrl('/');
  }

  openClassic(seed?: string | null): void {
    if (seed) {
      void this.router.navigate(['/classic', seed]);
      return;
    }
    void this.router.navigateByUrl('/classic');
  }

  openDaily(dateKey: string = dailyDateKey(), language?: GameLanguage, length?: WordLength): void {
    const queryParams = language && length ? { lang: language, len: String(length) } : undefined;
    void this.router.navigate(['/daily', dateKey], { queryParams });
  }

  openStats(): void {
    void this.router.navigateByUrl('/stats');
  }

  openSettings(): void {
    void this.router.navigateByUrl('/settings');
  }

  replaceClassicSeed(seed: string): void {
    void this.router.navigate(['/classic', seed], { replaceUrl: true });
  }

  replaceDailyDate(dateKey: string, language: GameLanguage, length: WordLength): void {
    void this.router.navigate(['/daily', dateKey], {
      replaceUrl: true,
      queryParams: { lang: language, len: String(length) },
    });
  }
}
