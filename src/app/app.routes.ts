import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./domains/tournament/tournament.routes').then(
        (m) => m.tournamentRoutes
      ),
  },
  { path: '**', redirectTo: '' },
];
