import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { AuthLayoutComponent } from './layout/auth-layout/auth-layout.component';
import { AuthGuard } from './core/guards/auth.guard';

import { GuestGuard } from './core/guards/guest.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    component: AuthLayoutComponent,
    canActivate: [GuestGuard],
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: 'showcase',
    canActivate: [AuthGuard],
    loadChildren: () => import('./features/showcase/showcase.routes').then(m => m.SHOWCASE_ROUTES)
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('./features/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES)
      },
      {
        path: 'zones',
        loadChildren: () => import('./features/zones/zones.routes').then(m => m.ZONES_ROUTES)
      },
      {
        path: 'warehouses',
        loadChildren: () => import('./features/warehouses/warehouses.routes').then(m => m.WAREHOUSES_ROUTES)
      },
      {
        path: 'clients',
        loadChildren: () => import('./features/clients/clients.routes').then(m => m.CLIENTS_ROUTES)
      },

      {
        path: 'inventory',
        loadChildren: () => import('./features/inventory/inventory.routes').then(m => m.INVENTORY_ROUTES)
      },
      {
        path: 'sales',
        loadChildren: () => import('./features/sales/sales.routes').then(m => m.SALES_ROUTES)
      },
      {
        path: 'users',
        loadChildren: () => import('./features/users/users.routes').then(m => m.USERS_ROUTES)
      },
      {
        path: 'map',
        loadChildren: () => import('./features/routes-map/routes-map.routes').then(m => m.ROUTES_MAP_ROUTES)
      }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
