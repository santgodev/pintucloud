import { Injectable } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { SupabaseService } from '../../../core/services/supabase.service';

export interface Client {
    id: string;
    name: string;
    address: string;
    phone?: string;
    email?: string;
    zone: string;
    city?: string;
    lastBuy: string; // Formatting to string for display, or Date
    advisorName?: string;
}

@Injectable({
    providedIn: 'root'
})
export class ClientsService {

    constructor(private supabase: SupabaseService) { }

    getAdvisors(): Observable<any[]> {
        return from(
            this.supabase.from('usuarios')
                .select('id, nombre_completo')
                .eq('rol', 'asesor')
                .then(({ data }) => data || [])
        );
    }

    getClients(filters?: { city?: string, advisorId?: string }): Observable<Client[]> {
        let query = this.supabase.from('clientes')
            .select('*, usuarios(nombre_completo)')
            .order('nombre', { ascending: true });

        if (filters?.city && filters.city !== 'Todas') {
            query = query.eq('ciudad', filters.city);
        }

        if (filters?.advisorId && filters.advisorId !== 'Todos') {
            query = query.eq('usuario_id', filters.advisorId);
        }

        return from(query).pipe(
            map(({ data, error }) => {
                if (error) {
                    console.error('Error fetching clients', error);
                    return [];
                }

                return (data || []).map((item: any) => ({
                    id: item.id,
                    name: item.nombre,
                    address: item.direccion,
                    phone: item.telefono,
                    email: item.email,
                    zone: item.zona || 'Sin Zona',
                    city: item.ciudad || 'Sin Ciudad',
                    lastBuy: this.formatDate(item.ultima_compra),
                    advisorName: item.usuarios?.nombre_completo || 'Sin Asignar'
                }));
            })
        );
    }

    private formatDate(dateStr: string): string {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        // Simple distinct logic for "2 days ago" vs date string
        // For simplicity, returning local date string
        return date.toLocaleDateString();
    }

    async createClient(client: Partial<Client>): Promise<string> {
        // 1. Get current user's distribuidor_id
        const user = await this.supabase.auth.getUser();
        if (!user.data.user) throw new Error('Usuario no autenticado');

        const { data: userData, error: userError } = await this.supabase
            .from('usuarios')
            .select('distribuidor_id')
            .eq('id', user.data.user.id)
            .single();

        if (userError || !userData) throw new Error('No se pudo obtener la información del usuario');

        // 2. Insert Client
        const newClient = {
            distribuidor_id: userData.distribuidor_id,
            nombre: client.name,
            direccion: client.address,
            telefono: client.phone,
            email: client.email,
            zona: client.zone,
            ciudad: client.city
        };

        const { data, error } = await this.supabase
            .from('clientes')
            .insert(newClient)
            .select()
            .single();

        if (error) throw error;
        return data.id;
    }
}
