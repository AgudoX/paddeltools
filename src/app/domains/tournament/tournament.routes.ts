import { Routes } from '@angular/router';

export const tournamentRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./containers/player-form-page/player-form-page.component').then(
        (m) => m.PlayerFormPageComponent
      ),
  },
  {
    path: 'tournament/:id',
    loadComponent: () =>
      import('./containers/summary-page/summary-page.component').then(
        (m) => m.SummaryPageComponent
      ),
  },
  {
    path: 'classic-tournament/:id',
    loadComponent: () =>
      import('./containers/classic-tournament-page/classic-tournament-page.component').then(
        (m) => m.ClassicTournamentPageComponent
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
      import('./containers/history-page/history-page.component').then(
        (m) => m.HistoryPageComponent
      ),
  },
  {
    path: 'history/:id',
    loadComponent: () =>
      import('./containers/history-detail-page/history-detail-page.component').then(
        (m) => m.HistoryDetailPageComponent
      ),
  },
];
