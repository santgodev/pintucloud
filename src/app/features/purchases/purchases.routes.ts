import { Routes } from '@angular/router';

export const PURCHASES_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./pages/purchases-list.page').then(m => m.PurchasesListPage),
    },
    {
        path: 'new',
        loadComponent: () =>
            import('./pages/purchase-create.page').then(m => m.PurchaseCreatePage),
    },
    {
        // Ruta de detalle (solo lectura para CONFIRMADA, redirige a /edit si BORRADOR)
        path: ':id',
        loadComponent: () =>
            import('./pages/purchase-detail/purchase-detail.page').then(m => m.PurchaseDetailPage),
    },
    {
        // Ruta para retomar / editar un BORRADOR existente
        path: ':id/edit',
        loadComponent: () =>
            import('./pages/purchase-create.page').then(m => m.PurchaseCreatePage),
    },
];
