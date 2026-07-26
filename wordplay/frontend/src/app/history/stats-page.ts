import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { NavigationService } from '../navigation/navigation.service';
import { HistoryPanel } from './history-panel';

@Component({
  selector: 'app-stats-page',
  imports: [HistoryPanel],
  template: '<app-history-panel (closed)="goHome()" />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsPage {
  private readonly navigation = inject(NavigationService);

  goHome(): void {
    this.navigation.goHome();
  }
}
