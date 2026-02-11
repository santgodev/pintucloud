import { Routes } from '@angular/router';
import { ShowcaseLayoutComponent } from './showcase-layout.component';
import { ProductGridComponent } from './components/product-grid/product-grid.component';

export const SHOWCASE_ROUTES: Routes = [
    {
        path: '',
        component: ShowcaseLayoutComponent,
        children: [
            { path: '', redirectTo: 'all', pathMatch: 'full' },
            { path: 'all', component: ProductGridComponent },
            { path: ':category', component: ProductGridComponent }
        ]
    }
];
