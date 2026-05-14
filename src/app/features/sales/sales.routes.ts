import { Routes } from '@angular/router';
import { SalesComponent } from './sales.component';
import { unsavedChangesGuard } from './guards/unsaved-changes.guard';

export const SALES_ROUTES: Routes = [
    { path: '', component: SalesComponent },
    {
        path: 'new',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
            import('./components/sales-capture/sales-capture.component')
                .then(m => m.SalesCaptureComponent)
    },


    // 🔴 Rutas específicas primero
    {
        path: ':id/invoice',
        loadComponent: () =>
            import('./sales-invoice.component')
                .then(m => m.SalesInvoiceComponent)
    },

    {
        path: ':id/edit',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
            import('./components/sales-capture/sales-capture.component')
                .then(m => m.SalesCaptureComponent)
    },

    // 🔵 Ruta genérica al final
    {
        path: ':id',
        loadComponent: () =>
            import('./sales-detail.component')
                .then(c => c.SalesDetailComponent)
    }
];
