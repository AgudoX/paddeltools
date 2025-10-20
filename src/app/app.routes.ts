import { Routes } from '@angular/router';
import { FormularioComponent } from './components/formulario/formulario.component';
import { ResumenComponent } from './components/resumen/resumen.component';

export const routes: Routes = [
  { path: '', component: FormularioComponent },
  { path: 'resumen', component: ResumenComponent },
  { path: '**', redirectTo: '' }
];
