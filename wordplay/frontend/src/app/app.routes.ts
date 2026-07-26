import { type Routes } from '@angular/router';

import { GamePage } from './game/game-page';
import { StatsPage } from './history/stats-page';
import { HomePage } from './home/home-page';
import { SettingsPage } from './settings/settings-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: HomePage },
  { path: 'classic', component: GamePage, data: { mode: 'classic' } },
  { path: 'classic/:seed', component: GamePage, data: { mode: 'classic' } },
  { path: 'daily', component: GamePage, data: { mode: 'daily' } },
  { path: 'daily/:date', component: GamePage, data: { mode: 'daily' } },
  { path: 'stats', component: StatsPage },
  { path: 'settings', component: SettingsPage },
  { path: '**', redirectTo: '' },
];
