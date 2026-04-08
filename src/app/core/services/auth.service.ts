import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, switchMap, tap, catchError } from 'rxjs/operators';
import { User, UserRole } from '../../models/user.model'; // App Model
import { SupabaseService } from './supabase.service';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private currentUserSubject = new BehaviorSubject<User | null>(null);
    public currentUser$ = this.currentUserSubject.asObservable();
    public currentUserSignal = signal<User | null>(null);
    public isAdmin = computed(() => {
        const user = this.currentUserSignal();
        return user?.role === 'admin_distribuidor';
    });
    private session: Session | null = null;

    constructor(private supabase: SupabaseService) {
        this.initializeAuth();
    }

    private initializeAuth() {
        // Check initial session
        this.supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                this.session = session;
                this.loadProfile(session.user.id);
            }
        });

        // Listen for changes
        this.supabase.auth.onAuthStateChange((_event, session) => {
            this.session = session;
            if (session) {
                this.loadProfile(session.user.id);
            } else {
                this.currentUserSubject.next(null);
                this.currentUserSignal.set(null);
            }
        });
    }

    get currentUserValue(): User | null {
        return this.currentUserSubject.value;
    }

    login(email: string, password: string): Observable<boolean> {
        return from(this.supabase.auth.signInWithPassword({ email, password })).pipe(
            map(({ data, error }) => {
                if (error) throw error;
                return !!data.session;
            }),
            catchError(err => {
                console.error('Login error:', err);
                return of(false);
            })
        );
    }

    logout(): Promise<void> {
        return this.supabase.auth.signOut().then(() => {
            this.currentUserSubject.next(null);
            this.currentUserSignal.set(null);
        });
    }

    isAuthenticated(): boolean {
        return !!this.currentUserSubject.value;
    }

    checkAuth(): Observable<boolean> {
        return from(this.supabase.auth.getSession()).pipe(
            map(({ data: { session } }) => {
                if (session) {
                    this.session = session;
                    if (!this.currentUserSubject.value) {
                        this.loadProfile(session.user.id);
                    }
                    return true;
                }
                return false;
            }),
            catchError(() => of(false))
        );
    }

    private async loadProfile(userId: string) {
        try {
            const { data, error } = await this.supabase
                .from('usuarios')
                .select('*')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error loading profile:', error);
                return;
            }

            if (data) {
                let normalizedRole: UserRole = data.rol;
                if (data.rol === 'ADMIN') normalizedRole = 'admin_distribuidor';
                else if (data.rol === 'SELLER' || data.rol === 'WAREHOUSE_MANAGER') normalizedRole = 'asesor';

                const user: User = {
                    id: data.id,
                    email: data.email,
                    fullName: data.nombre_completo,
                    role: normalizedRole,
                    companyId: data.distribuidor_id,
                    distribuidor_id: data.distribuidor_id, // For backward compatibility
                    zones: [],
                    isActive: true,
                    avatarUrl: data.avatar_url,
                    lastLogin: new Date()
                };
                this.currentUserSubject.next(user);
                this.currentUserSignal.set(user);
            }
        } catch (error) {
            console.error('Unexpected error loading profile:', error);
        }
    }
}
