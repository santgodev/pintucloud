import { Routes } from '@angular/router';

export const PROVEEDORES_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./pages/proveedores-list.page').then(m => m.ProveedoresListPage),
    },
    {
        path: 'new',
        loadComponent: () =>
            import('./pages/proveedores-create.page').then(m => m.ProveedoresCreatePage),
    },
    {
        path: ':id/edit',
        loadComponent: () =>
            import('./pages/proveedores-edit.page').then(m => m.ProveedoresEditPage),
    },
];
