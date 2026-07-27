import { ChangeDetectionStrategy, Component, DestroyRef, inject, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TuiButton, TuiDialogService, TuiScrollbar } from '@taiga-ui/core';
import { TUI_CONFIRM, type TuiConfirmData } from '@taiga-ui/kit';

import { DifficultyService } from '../game/difficulty.service';
import { type Difficulty, type GameMode, type WordTier } from '../game/game.types';
import { HistoryService } from '../game/history.service';
import { WordTierService } from '../game/word-tier.service';
import { LocaleService } from '../i18n/locale.service';
import { TranslatePipe } from '../i18n/translate.pipe';
import { type TranslationKey } from '../i18n/translations';

@Component({
  selector: 'app-history-panel',
  imports: [TuiButton, TuiScrollbar, TranslatePipe],
  templateUrl: './history-panel.html',
  styleUrl: './history-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryPanel {
  private readonly history = inject(HistoryService);
  private readonly difficulties = inject(DifficultyService);
  private readonly wordTiers = inject(WordTierService);
  private readonly i18n = inject(LocaleService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly destroyRef = inject(DestroyRef);

  readonly closed = output<void>();

  readonly locale = this.i18n.current;
  readonly entries = this.history.forStatsMode;
  readonly stats = this.history.stats;
  readonly statsMode = this.history.statsMode;
  readonly difficulty = this.difficulties.difficulty;
  readonly wordTier = this.wordTiers.wordTier;

  selectMode(mode: GameMode): void {
    this.history.setStatsMode(mode);
  }

  close(): void {
    this.closed.emit();
  }

  confirmResetStats(): void {
    if (this.stats().played === 0) {
      return;
    }

    const data: TuiConfirmData = {
      content: this.i18n.t('history.resetConfirmText'),
      yes: this.i18n.t('history.resetConfirmYes'),
      no: this.i18n.t('history.resetConfirmNo'),
      appearance: 'primary-destructive',
    };

    this.dialogs
      .open<boolean>(TUI_CONFIRM, {
        label: this.i18n.t('history.resetConfirmTitle'),
        size: 's',
        data,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.history.clearCurrentStats();
        }
      });
  }

  difficultyKey(difficulty: Difficulty): TranslationKey {
    switch (difficulty) {
      case 'easy':
        return 'settings.difficulty.easy';
      case 'hard':
        return 'settings.difficulty.hard';
      default:
        return 'settings.difficulty.normal';
    }
  }

  dictionaryKey(tier: WordTier): TranslationKey {
    switch (tier) {
      case 'easy':
        return 'settings.dictionary.easy';
      case 'hard':
        return 'settings.dictionary.hard';
      default:
        return 'settings.dictionary.medium';
    }
  }
}
