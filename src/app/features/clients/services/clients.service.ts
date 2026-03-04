import { Injectable } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { SupabaseService } from '../../../core/services/supabase.service';

export interface Client {
    id: string;
    codigo: string;
    razon_social: string;
    ciudad: string;
    address: string;
    phone?: string;
    email?: string;
    lastBuy: string;
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
            .order('razon_social', { ascending: true });

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
                    codigo: item.codigo || '',
                    razon_social: item.razon_social || '',
                    ciudad: item.ciudad || '',
                    address: item.direccion || '',
                    phone: item.telefono,
                    email: item.email,
                    lastBuy: this.formatDate(item.ultima_compra),
                    advisorName: item.usuarios?.nombre_completo || 'Sin Asignar'
                }));
            })
        );
    }

    private formatDate(dateStr: string): string {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString();
    }

    async createClient(client: {
        codigo: string;
        razon_social: string;
        ciudad: string;
        direccion: string;
        telefono: string;
        email?: string;
    }): Promise<string> {
        const user = await this.supabase.auth.getUser();
        if (!user.data.user) throw new Error('Usuario no autenticado');

        const { data: userData, error: userError } = await this.supabase
            .from('usuarios')
            .select('distribuidor_id')
            .eq('id', user.data.user.id)
            .single();

        if (userError || !userData) throw new Error('No se pudo obtener la información del usuario');

        const { data, error } = await this.supabase
            .from('clientes')
            .insert({
                distribuidor_id: userData.distribuidor_id,
                codigo: client.codigo,
                razon_social: client.razon_social,
                ciudad: client.ciudad,
                direccion: client.direccion,
                telefono: client.telefono,
                email: client.email || null
            })
            .select()
            .single();

        if (error) throw error;
        return data.id;
    }
}
