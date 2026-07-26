import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { dailyDateKey } from '../game/daily-word';
import { GameLanguageService } from '../game/game-language.service';
import { WordLengthService } from '../game/word-length.service';
import { HelpService } from '../navigation/help.service';
import { NavigationService } from '../navigation/navigation.service';
import { PwaUpdateService } from '../pwa/pwa-update.service';
import { HomeScreen } from './home-screen';

@Component({
  selector: 'app-home-page',
  imports: [HomeScreen],
  template: `
    <app-home-screen
      [updateAvailable]="updateAvailable()"
      (classic)="openClassic()"
      (daily)="openDaily()"
      (stats)="openStats()"
      (settings)="openSettings()"
      (help)="openHelp()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  private readonly navigation = inject(NavigationService);
  private readonly help = inject(HelpService);
  private readonly updates = inject(PwaUpdateService);
  private readonly languages = inject(GameLanguageService);
  private readonly lengths = inject(WordLengthService);

  readonly updateAvailable = this.updates.updateAvailable;

  openClassic(): void {
    this.navigation.openClassic();
  }

  openDaily(): void {
    this.navigation.openDaily(dailyDateKey(), this.languages.language(), this.lengths.wordLength());
  }

  openStats(): void {
    this.navigation.openStats();
  }

  openSettings(): void {
    this.navigation.openSettings();
  }

  openHelp(): void {
    this.help.show();
  }
}
