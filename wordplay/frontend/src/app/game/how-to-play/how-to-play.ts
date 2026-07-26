import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TuiButton } from '@taiga-ui/core';

import { TranslatePipe } from '../../i18n/translate.pipe';
import { type AppLocale } from '../../i18n/translations';
import { type WordLength } from '../game.types';

@Component({
  selector: 'app-how-to-play',
  imports: [TuiButton, TranslatePipe],
  templateUrl: './how-to-play.html',
  styleUrl: './how-to-play.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HowToPlay {
  readonly locale = input.required<AppLocale>();
  readonly wordLength = input.required<WordLength>();
  readonly maxAttempts = input.required<number>();
  readonly closed = output<void>();

  readonly examples = computed(() => [
    {
      word: ['W', 'E', 'A', 'R', 'Y'],
      highlight: 0,
      status: 'correct' as const,
      titleKey: 'help.blue' as const,
      descriptionKey: 'help.blueDesc' as const,
    },
    {
      word: ['P', 'I', 'L', 'L', 'S'],
      highlight: 1,
      status: 'present' as const,
      titleKey: 'help.yellow' as const,
      descriptionKey: 'help.yellowDesc' as const,
    },
    {
      word: ['V', 'A', 'G', 'U', 'E'],
      highlight: 3,
      status: 'absent' as const,
      titleKey: 'help.gray' as const,
      descriptionKey: 'help.grayDesc' as const,
    },
  ]);

  close(): void {
    this.closed.emit();
  }
}
