import { Injectable, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Notification {
    id: string;
    titulo: string;
    mensaje: string;
    leida: boolean;
    metadata: any;
    created_at: string;
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private notificationsSignal = signal<Notification[]>([]);
    
    // Selectors
    public notifications = computed(() => this.notificationsSignal());
    public unreadCount = computed(() => this.notificationsSignal().filter(n => !n.leida).length);

    constructor(
        private supabase: SupabaseService,
        private authService: AuthService
    ) {
        this.init();
    }

    private async init() {
        // Wait for user to be logged in
        this.authService.currentUser$.subscribe(user => {
            if (user) {
                this.loadNotifications(user.id);
                this.subscribeToRealtime(user.id);
            } else {
                this.notificationsSignal.set([]);
            }
        });
    }

    private async loadNotifications(userId: string) {
        const { data, error } = await this.supabase
            .from('notificaciones')
            .select('*')
            .eq('usuario_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            console.error('Error loading notifications:', error);
            return;
        }

        this.notificationsSignal.set(data || []);
    }

    private subscribeToRealtime(userId: string) {
        this.supabase.client.channel('public:notificaciones')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notificaciones',
                    filter: `usuario_id=eq.${userId}`
                },
                (payload: any) => {
                    const newNotif = payload.new as Notification;
                    this.notificationsSignal.update(current => [newNotif, ...current].slice(0, 20));
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'notificaciones',
                    filter: `usuario_id=eq.${userId}`
                },
                (payload: any) => {
                    const updatedNotif = payload.new as Notification;
                    this.notificationsSignal.update(current => 
                        current.map(n => n.id === updatedNotif.id ? updatedNotif : n)
                    );
                }
            )
            .subscribe();
    }

    async markAsRead(id: string) {
        const { error } = await this.supabase
            .from('notificaciones')
            .update({ leida: true })
            .eq('id', id);

        if (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    async markAllAsRead() {
        const user = this.authService.currentUserValue;
        if (!user) return;

        const { error } = await this.supabase
            .from('notificaciones')
            .update({ leida: true })
            .eq('usuario_id', user.id)
            .eq('leida', false);

        if (error) {
            console.error('Error marking all as read:', error);
        }
    }
}
