import { Routes } from '@angular/router';

export const tournamentRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./containers/player-form/player-form.component').then(
        (m) => m.PlayerFormComponent
      ),
  },
  {
    path: 'summary',
    loadComponent: () =>
      import('./containers/summary/summary.component').then(
        (m) => m.SummaryComponent
      ),
  },
];
