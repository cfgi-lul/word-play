import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { type AppLocale } from '../../i18n/translations';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { type Board, type WordLength } from '../game.types';

@Component({
  selector: 'app-game-board',
  imports: [TranslatePipe],
  templateUrl: './game-board.html',
  styleUrl: './game-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--wp-cols]': 'wordLength()',
    '[attr.data-length]': 'wordLength()',
  },
})
export class GameBoard {
  readonly board = input.required<Board>();
  readonly locale = input.required<AppLocale>();
  readonly wordLength = input.required<WordLength>();
}
