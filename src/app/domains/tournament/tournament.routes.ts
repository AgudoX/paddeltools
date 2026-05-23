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
    path: 'tournament/:id',
    loadComponent: () =>
      import('./containers/summary/summary.component').then(
        (m) => m.SummaryComponent
      ),
  },
  {
    path: 'summary',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: 'history',
    loadComponent: () =>
      import('./containers/history/history.component').then(
        (m) => m.HistoryComponent
      ),
  },
  {
    path: 'history/:id',
    loadComponent: () =>
      import('./containers/history-detail/history-detail.component').then(
        (m) => m.HistoryDetailComponent
      ),
  },
];
