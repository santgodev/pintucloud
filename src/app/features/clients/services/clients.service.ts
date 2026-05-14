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
    sector?: string;
    nit?: string;
    lastBuy: string;
    cartera_pendiente: number;
    advisorName?: string;
}

export interface PaginatedClients {
    data: Client[];
    total: number;
}

@Injectable({
    providedIn: 'root'
})
export class ClientsService {

    constructor(private supabase: SupabaseService) { }



    getClients(filters?: {
        page?: number,
        pageSize?: number,
        search?: string,
        sector?: string,
        sortField?: string,
        sortDirection?: 'asc' | 'desc'
    }): Observable<any> {
        return from(this.fetchClients(filters));
    }

    async getClientsList(): Promise<any[]> {
        const { data, error } = await this.supabase
            .from('clientes')
            .select('id, codigo, razon_social, telefono, ciudad')
            .order('razon_social');

        if (error) throw error;
        return data || [];
    }

    private async fetchClients(filters?: {
        page?: number,
        pageSize?: number,
        search?: string,
        sector?: string,
        sortField?: string,
        sortDirection?: 'asc' | 'desc'
    }): Promise<any> {
        const page = filters?.page || 0;
        const pageSize = filters?.pageSize || 10;
        const sortField = filters?.sortField || 'razon_social';
        const sortDirection = filters?.sortDirection || 'asc';

        let query = this.supabase.from('clientes')
            .select('*, usuarios(nombre_completo), ventas(fecha)', { count: 'exact' });

        if (filters?.search) {
            const s = `%${filters.search}%`;
            query = query.or(`codigo.ilike.${s},razon_social.ilike.${s},ciudad.ilike.${s},telefono.ilike.${s},sector.ilike.${s}`);
        }

        if (filters?.sector) {
            query = query.eq('sector', filters.sector);
        }

        // Apply sorting
        // Handle special sort fields mapping to DB columns if necessary
        const dbSortField = sortField === 'clientName' ? 'razon_social' :
            sortField === 'Última compra' ? 'ultima_compra' :
                sortField === 'Código' ? 'codigo' :
                    sortField === 'Ciudad' ? 'ciudad' : sortField;

        query = query.order(dbSortField, { ascending: sortDirection === 'asc' });

        // Apply pagination
        const fromRow = page * pageSize;
        const toRow = fromRow + pageSize - 1;
        query = query.range(fromRow, toRow);

        const { data, count, error } = await query;
        if (error) {
            console.error('Error fetching clients', error);
            return { data: [], total: 0 };
        }

        // Obtener la deuda real de todos los clientes mediante un RPC
        const { data: carteraData, error: carteraError } = await this.supabase.rpc('get_cartera_por_cliente', {});
        if (carteraError) {
            console.error('Error fetching cartera por cliente:', carteraError);
        }

        // Crear mapa cliente_id -> deuda
        const carteraMap = new Map<string, number>();
        (carteraData || []).forEach((row: any) => {
            carteraMap.set(row.cliente_id, Number(row.deuda || 0));
        });

        const formattedData = (data || []).map((item: any) => {
            const ventas = item.ventas || [];
            let lastBuyDateStr = item.ultima_compra; // default to existing field if present

            if (ventas.length > 0) {
                // Find max date from ventas array
                const maxFecha = ventas.reduce((max: any, p: any) => p.fecha > max ? p.fecha : max, ventas[0].fecha);
                lastBuyDateStr = maxFecha;
            }

            return {
                id: item.id,
                codigo: item.codigo || '',
                razon_social: item.razon_social || '',
                ciudad: item.ciudad || '',
                address: item.direccion || '',
                phone: item.telefono,
                email: item.email,
                sector: item.sector,
                nit: item.nit,
                lastBuy: lastBuyDateStr ? this.formatDate(lastBuyDateStr) : 'N/A',
                cartera_pendiente: carteraMap.get(item.id) || 0, // Real debt or 0
                advisorName: item.usuarios?.nombre_completo || 'Sin Asignar'
            };
        });

        return { data: formattedData, total: count || 0 };
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
        sector: string;
        nit?: string;
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
                email: client.email || null,
                sector: client.sector,
                nit: client.nit || null
            })
            .select()
            .single();

        if (error) throw error;
        return data.id;
    }

    async updateClient(id: string, client: {
        codigo: string;
        razon_social: string;
        ciudad: string;
        direccion: string;
        telefono: string;
        email?: string;
        sector: string;
        nit?: string;
    }): Promise<void> {
        const { error } = await this.supabase
            .from('clientes')
            .update({
                codigo: client.codigo,
                razon_social: client.razon_social,
                ciudad: client.ciudad,
                direccion: client.direccion,
                telefono: client.telefono,
                email: client.email || null,
                sector: client.sector,
                nit: client.nit || null
            })
            .eq('id', id);

        if (error) throw error;
    }

    async deleteClient(id: string): Promise<void> {
        const { error } = await this.supabase
            .from('clientes')
            .delete()
            .eq('id', id);

        if (error) {
            if (error.code === '23503') {
                throw new Error('No se puede eliminar este cliente porque ya tiene historial de ventas o cartera. Para "borrarlo" debe estar sin movimientos.');
            }
            throw error;
        }
    }
}
