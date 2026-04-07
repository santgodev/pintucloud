import { Routes } from '@angular/router';
import { InventoryComponent } from './inventory.component';
import { RoleGuard } from '../../core/guards/role.guard';

export const INVENTORY_ROUTES: Routes = [
    {
        path: '',
        component: InventoryComponent,
        canActivate: [RoleGuard],
        data: { roles: ['admin_distribuidor'] }
    }
];
