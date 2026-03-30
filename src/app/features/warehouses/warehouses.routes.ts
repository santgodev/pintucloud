import { Routes } from '@angular/router';
import { WarehousesComponent } from './warehouses.component';
import { RoleGuard } from '../../core/guards/role.guard';

export const WAREHOUSES_ROUTES: Routes = [
    {
        path: '',
        component: WarehousesComponent,
        canActivate: [RoleGuard],
        data: { roles: ['ADMIN'] }
    }
];
