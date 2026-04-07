import { Injectable, inject } from '@angular/core';
import { Router, CanActivate, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { map, filter, take, switchMap } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class AdminGuard implements CanActivate {
    private authService = inject(AuthService);
    private router = inject(Router);

    canActivate(): Observable<boolean | UrlTree> {
        return this.authService.checkAuth().pipe(
            switchMap(isAuthenticated => {
                if (!isAuthenticated) {
                    return [this.router.createUrlTree(['/auth/login'])];
                }

                // Wait for the profile to be loaded in the signal/observable
                return this.authService.currentUser$.pipe(
                    filter(user => user !== null), // Wait until user is loaded
                    take(1),
                    map(user => {
                        if (user?.role === 'admin_distribuidor' || user?.role === 'admin_distribuidor') {
                            return true;
                        }
                        return this.router.createUrlTree(['/dashboard']);
                    })
                );
            })
        );
    }
}
