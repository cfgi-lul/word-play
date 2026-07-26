import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { NavigationService } from '../navigation/navigation.service';
import { PwaUpdateService } from '../pwa/pwa-update.service';
import { SettingsPanel } from './settings-panel';

@Component({
  selector: 'app-settings-page',
  imports: [SettingsPanel],
  template: `
    <app-settings-panel [initialTab]="updateAvailable() ? 'system' : 'game'" (closed)="goHome()" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  private readonly navigation = inject(NavigationService);
  private readonly updates = inject(PwaUpdateService);

  readonly updateAvailable = this.updates.updateAvailable;

  goHome(): void {
    this.navigation.goHome();
  }
}
