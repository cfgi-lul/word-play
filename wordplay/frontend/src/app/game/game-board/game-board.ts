import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { TranslatePipe } from '../../i18n/translate.pipe';
import { type AppLocale } from '../../i18n/translations';
import { type Board, type WordLength } from '../game.types';

@Component({
  selector: 'app-game-board',
  imports: [TranslatePipe],
  templateUrl: './game-board.html',
  styleUrl: './game-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-length]': 'wordLength()',
    '[style.--wp-cols]': 'wordLength()',
    '[style.--wp-rows]': 'board().length',
  },
})
export class GameBoard {
  readonly board = input.required<Board>();
  readonly locale = input.required<AppLocale>();
  readonly wordLength = input.required<WordLength>();
}
