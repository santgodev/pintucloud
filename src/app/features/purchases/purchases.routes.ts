import { Routes } from '@angular/router';
import { RoleGuard } from '../../core/guards/role.guard';

export const PURCHASES_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./pages/purchases-list.page').then(m => m.PurchasesListPage),
        canActivate: [RoleGuard],
        data: { roles: ['admin_distribuidor'] }
    },
    {
        path: 'new',
        loadComponent: () =>
            import('./pages/purchase-create.page').then(m => m.PurchaseCreatePage),
        canActivate: [RoleGuard],
        data: { roles: ['admin_distribuidor'] }
    },
    {
        // Ruta de detalle (solo lectura para CONFIRMADA, redirige a /edit si BORRADOR)
        path: ':id',
        loadComponent: () =>
            import('./pages/purchase-detail/purchase-detail.page').then(m => m.PurchaseDetailPage),
        canActivate: [RoleGuard],
        data: { roles: ['admin_distribuidor'] }
    },
    {
        // Ruta para retomar / editar un BORRADOR existente
        path: ':id/edit',
        loadComponent: () =>
            import('./pages/purchase-create.page').then(m => m.PurchaseCreatePage),
        canActivate: [RoleGuard],
        data: { roles: ['admin_distribuidor'] }
    },
];
