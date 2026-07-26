import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { TuiButton, TuiScrollbar } from '@taiga-ui/core';

import { GameService } from '../game/game.service';
import { type GameLanguage, WORD_LENGTHS, type WordLength } from '../game/game.types';
import { LocaleService } from '../i18n/locale.service';
import { TranslatePipe } from '../i18n/translate.pipe';
import { type AppLocale } from '../i18n/translations';
import { type ThemeMode, ThemeService } from '../theme/theme.service';

@Component({
  selector: 'app-settings-panel',
  imports: [TuiButton, TuiScrollbar, TranslatePipe],
  templateUrl: './settings-panel.html',
  styleUrl: './settings-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPanel {
  private readonly themes = inject(ThemeService);
  private readonly i18n = inject(LocaleService);
  private readonly game = inject(GameService);

  readonly open = input(false);
  readonly closed = output<void>();

  readonly theme = this.themes.theme;
  readonly locale = this.i18n.current;
  readonly wordLanguage = this.game.language;
  readonly wordLength = this.game.wordLength;
  readonly wordLengths = WORD_LENGTHS;

  selectTheme(theme: ThemeMode): void {
    this.themes.setTheme(theme);
  }

  selectLocale(locale: AppLocale): void {
    this.i18n.setLocale(locale);
  }

  selectWordLanguage(language: GameLanguage): void {
    this.game.setLanguage(language);
  }

  selectWordLength(length: WordLength): void {
    this.game.setWordLength(length);
  }

  close(): void {
    this.closed.emit();
  }
}
