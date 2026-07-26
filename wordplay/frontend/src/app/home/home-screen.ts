import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { TuiButton } from '@taiga-ui/core';

import { LocaleService } from '../i18n/locale.service';
import { TranslatePipe } from '../i18n/translate.pipe';

@Component({
  selector: 'app-home-screen',
  imports: [TuiButton, TranslatePipe],
  templateUrl: './home-screen.html',
  styleUrl: './home-screen.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeScreen {
  private readonly i18n = inject(LocaleService);

  readonly locale = this.i18n.current;
  readonly classic = output<void>();
  readonly daily = output<void>();
  readonly stats = output<void>();
  readonly settings = output<void>();
  readonly help = output<void>();
}
