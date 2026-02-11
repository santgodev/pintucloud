import { Injectable } from '@angular/core';
import { Router, CanActivate, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate {

    constructor(private authService: AuthService, private router: Router) { }

    canActivate(): Observable<boolean | UrlTree> {
        return this.authService.checkAuth().pipe(
            tap(isAuthenticated => {
                if (!isAuthenticated) {
                    this.router.navigate(['/auth/login']);
                }
            }),
            map(isAuthenticated => isAuthenticated || this.router.createUrlTree(['/auth/login']))
        );
    }
}
