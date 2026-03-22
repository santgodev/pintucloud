import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
    providedIn: 'root'
})
export class RoleGuard implements CanActivate {
    constructor(private authService: AuthService, private router: Router) { }

    canActivate(
        route: ActivatedRouteSnapshot
    ): Observable<boolean | UrlTree> {
        const expectedRoles = route.data['roles'] as Array<string>;

        return this.authService.checkAuth().pipe(
            take(1),
            switchMap(isAuthenticated => {
                if (!isAuthenticated) {
                    return of(this.router.createUrlTree(['/auth/login']));
                }

                return this.authService.currentUser$.pipe(
                    take(1),
                    map(user => {
                        if (!user) {
                            return this.router.createUrlTree(['/auth/login']);
                        }

                        if (expectedRoles && expectedRoles.includes(user.role)) {
                            return true;
                        }

                        // If role not allowed, redirect to dashboard
                        return this.router.createUrlTree(['/dashboard']);
                    })
                );
            })
        );
    }
}
