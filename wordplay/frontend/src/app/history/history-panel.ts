import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { TuiButton, TuiScrollbar } from '@taiga-ui/core';

import { HistoryService } from '../game/history.service';
import { LocaleService } from '../i18n/locale.service';
import { TranslatePipe } from '../i18n/translate.pipe';

@Component({
  selector: 'app-history-panel',
  imports: [TuiButton, TuiScrollbar, TranslatePipe],
  templateUrl: './history-panel.html',
  styleUrl: './history-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryPanel {
  private readonly history = inject(HistoryService);
  private readonly i18n = inject(LocaleService);

  readonly open = input(false);
  readonly closed = output<void>();

  readonly locale = this.i18n.current;
  readonly entries = this.history.all;
  readonly stats = this.history.stats;

  close(): void {
    this.closed.emit();
  }
}
