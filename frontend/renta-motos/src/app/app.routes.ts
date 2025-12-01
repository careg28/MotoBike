import { Routes } from '@angular/router';

// Layouts
import { Shell } from './layout/shell/shell';             // ⬅️ tu <app-shell>
import { Admin} from './layout/admin/admin';     // ⬅️ layout admin (ver Paso 3)

// Páginas públicas
import { Home } from './features/home/pages/home/home';
import { Models } from './features/pages/models/models';
import { Login } from './core/login/login';

// Admin
import { ListadoMotos } from './admin/listado-motos/listado-motos';

import { authGuard } from './core/guards/guard';
import { guestGuard } from './core/guards/guest-guard';
import { ModelosList } from './admin/modelos-list/modelos-list'; 
export const routes: Routes = [
  // Público con layout Shell
  {
    path: '',
    component: Shell,
    children: [
      { path: '', component: Home, pathMatch: 'full' },
      { path: 'modelos', component: Models },
      { path: 'rutas', loadComponent: () => import('./features/pages/routes/routes').then(m => m.Routes) },
      { path: 'modelos/:slug', loadComponent: () => import('./features/pages/modelo-detalle/modelo-detalle').then(m => m.ModeloDetalle) },
      { path: 'login', component: Login, canActivate: [guestGuard] },
      { path: 'reservar/:slug', loadComponent: () => import('./features/pages/reserva/reserva').then(m => m.Reserva) },
    ]
  },

  // Admin con su layout 
  {
    path: 'admin',
    component: Admin,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'motos' },
      { path: 'motos', component: ListadoMotos },
      { path: 'motos/nueva', loadComponent: () => import('./admin/motos-form/motos-form').then(m => m.MotosForm) },
      { path: 'motos/editar/:slug', loadComponent: () => import('./admin/motos-form/motos-form').then(m => m.MotosForm) },
      //modelos
      { path: 'modelos', component: ModelosList },
      { path: 'modelos/nuevo',  loadComponent: () => import('./admin/modelos-form/modelos-form').then(m => m.ModelosForm) },
      { path: 'modelos/editar/:slug', loadComponent: () => import('./admin/modelos-form/modelos-form').then(m => m.ModelosForm) },
      
      // { path: 'clientes', loadComponent: ... }
      // { path: 'reservas', loadComponent: ... }
    ]
  },

  // Fallback
  { path: '**', redirectTo: '' }
];