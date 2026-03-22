import { Routes } from '@angular/router';
import { UserListComponent } from './components/user-list.component';
import { RoleGuard } from '../../core/guards/role.guard';

export const USERS_ROUTES: Routes = [
    {
        path: '',
        component: UserListComponent,
        canActivate: [RoleGuard],
        data: { roles: ['ADMIN'] }
    }
];
