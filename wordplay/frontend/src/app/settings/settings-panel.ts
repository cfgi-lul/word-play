import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { TuiButton, TuiScrollbar } from '@taiga-ui/core';

import { DifficultyService } from '../game/difficulty.service';
import { GameService } from '../game/game.service';
import {
  type Difficulty,
  type GameLanguage,
  WORD_LENGTHS,
  type WordLength,
  type WordTier,
} from '../game/game.types';
import { GameModeService } from '../game/game-mode.service';
import { WordTierService } from '../game/word-tier.service';
import { LocaleService } from '../i18n/locale.service';
import { TranslatePipe } from '../i18n/translate.pipe';
import { type AppLocale } from '../i18n/translations';
import { NavigationService } from '../navigation/navigation.service';
import { PwaUpdateService } from '../pwa/pwa-update.service';
import { type ThemeMode, ThemeService } from '../theme/theme.service';

export type SettingsTab = 'game' | 'system';

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
  private readonly difficulties = inject(DifficultyService);
  private readonly wordTiers = inject(WordTierService);
  private readonly modes = inject(GameModeService);
  private readonly navigation = inject(NavigationService);
  private readonly updates = inject(PwaUpdateService);

  readonly open = input(false);
  /** Which tab to show when the dialog opens. */
  readonly initialTab = input<SettingsTab>('game');
  readonly closed = output<void>();

  readonly tab = signal<SettingsTab>('game');
  readonly theme = this.themes.theme;
  readonly locale = this.i18n.current;
  readonly wordLanguage = this.game.language;
  readonly wordLength = this.game.wordLength;
  readonly difficulty = this.difficulties.difficulty;
  readonly wordTier = this.wordTiers.wordTier;
  readonly wordLengths = WORD_LENGTHS;
  readonly updateAvailable = this.updates.updateAvailable;
  readonly isApplyingUpdate = this.updates.isApplyingUpdate;
  readonly showDifficultySettings = computed(
    () => this.navigation.screen() !== 'game' || this.modes.mode() !== 'daily',
  );

  constructor() {
    effect(() => {
      if (this.open()) {
        this.tab.set(untracked(this.initialTab));
      }
    });
  }

  selectTab(tab: SettingsTab): void {
    this.tab.set(tab);
  }

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

  selectDifficulty(difficulty: Difficulty): void {
    this.game.setDifficulty(difficulty);
  }

  selectWordTier(tier: WordTier): void {
    this.game.setWordTier(tier);
  }

  applyUpdate(): void {
    void this.updates.applyUpdate();
  }

  close(): void {
    this.closed.emit();
  }
}
