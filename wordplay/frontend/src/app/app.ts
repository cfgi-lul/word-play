import { afterNextRender, ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TuiButton, TuiRoot, TuiScrollbar } from '@taiga-ui/core';

import { GameService } from './game/game.service';
import { HowToPlay } from './game/how-to-play/how-to-play';
import { LocaleService } from './i18n/locale.service';
import { TranslatePipe } from './i18n/translate.pipe';
import { HelpService } from './navigation/help.service';
import { ThemeService } from './theme/theme.service';

@Component({
  selector: 'app-root',
  imports: [TuiRoot, TuiButton, TuiScrollbar, RouterOutlet, HowToPlay, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:keydown)': 'onWindowKeydown($event)' },
})
export class App {
  private readonly themes = inject(ThemeService);
  private readonly i18n = inject(LocaleService);
  private readonly help = inject(HelpService);
  private readonly game = inject(GameService);

  readonly locale = this.i18n.current;
  readonly helpOpen = this.help.open;
  readonly wordLength = this.game.wordLength;
  readonly maxAttempts = this.game.maxAttempts;

  constructor() {
    void this.themes.theme();
    void this.i18n.current();

    afterNextRender(() => {
      if (this.shouldShowIntro()) {
        this.help.show();
      }
    });
  }

  onWindowKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.helpOpen()) {
      this.closeHelp();
    }
  }

  closeHelp(): void {
    this.markIntroSeen();
    this.help.hide();
  }

  private shouldShowIntro(): boolean {
    return localStorage.getItem('word-play-intro-seen') !== '1';
  }

  private markIntroSeen(): void {
    localStorage.setItem('word-play-intro-seen', '1');
  }
}
