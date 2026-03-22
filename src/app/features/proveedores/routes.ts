import { Routes } from '@angular/router';
import { RoleGuard } from '../../core/guards/role.guard';

export const PROVEEDORES_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./pages/proveedores-list.page').then(m => m.ProveedoresListPage),
        canActivate: [RoleGuard],
        data: { roles: ['ADMIN'] }
    },
    {
        path: 'new',
        loadComponent: () =>
            import('./pages/proveedores-create.page').then(m => m.ProveedoresCreatePage),
        canActivate: [RoleGuard],
        data: { roles: ['ADMIN'] }
    },
    {
        path: ':id/edit',
        loadComponent: () =>
            import('./pages/proveedores-edit.page').then(m => m.ProveedoresEditPage),
        canActivate: [RoleGuard],
        data: { roles: ['ADMIN'] }
    },
];
