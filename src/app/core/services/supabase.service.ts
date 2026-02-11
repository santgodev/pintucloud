import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { Observable, from, map } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class SupabaseService {
    private supabase: SupabaseClient;

    constructor() {
        // Custom storage wrapper to avoid NavigatorLock deadlocks in some environments
        const customStorage = {
            getItem: (key: string) => window.localStorage.getItem(key),
            setItem: (key: string, value: string) => window.localStorage.setItem(key, value),
            removeItem: (key: string) => window.localStorage.removeItem(key),
        };

        this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey, {
            auth: {
                storage: customStorage,
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                storageKey: 'inventory-system-auth'
            }
        });
    }

    get client(): SupabaseClient {
        return this.supabase;
    }

    // auth wrapper
    get auth() {
        return this.supabase.auth;
    }

    // storage wrapper
    get storage() {
        return this.supabase.storage;
    }

    // Basic query helper
    from(table: string) {
        return this.supabase.from(table);
    }

    rpc(fn: string, args: any) {
        return this.supabase.rpc(fn, args);
    }
}
