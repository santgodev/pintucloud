import { Injectable } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { SupabaseService } from '../../../core/services/supabase.service';

export interface Sale {
    id: string;
    clientId: string;
    clientName?: string;
    date: Date;
    total: number;
    status: 'pendiente' | 'completado' | 'cancelado';
}

export interface SaleDetail {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
}

export interface SaleItemInput {
    producto_id: string;
    cantidad: number;
    precio_unitario: number;
}

@Injectable({
    providedIn: 'root'
})
export class SalesService {

    constructor(private supabase: SupabaseService) { }

    getSales(): Observable<Sale[]> {
        const query = this.supabase.from('ventas')
            .select(`
                *,
                clientes (nombre)
            `)
            .order('fecha', { ascending: false });

        return from(query).pipe(
            map(({ data, error }) => {
                if (error) {
                    console.error('Error loading sales', error);
                    return [];
                }
                return (data || []).map((item: any) => ({
                    id: item.id,
                    clientId: item.cliente_id,
                    clientName: item.clientes?.nombre || 'Cliente Desconocido',
                    date: new Date(item.fecha),
                    total: item.total,
                    status: item.estado
                }));
            })
        );
    }

    getSalesToday(): Observable<number> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const query = this.supabase.from('ventas')
            .select('total')
            .gte('fecha', today.toISOString());

        return from(query).pipe(
            map(({ data, error }) => {
                if (error || !data) return 0;
                return data.reduce((sum, sale) => sum + (sale.total || 0), 0);
            })
        );
    }

    createSale(clientId: string, items: SaleItemInput[], total: number): Observable<string> {
        return from(this.supabase.rpc('registrar_venta', {
            p_cliente_id: clientId,
            p_items: items,
            p_total: total
        })).pipe(
            map(({ data, error }) => {
                if (error) throw error;
                return data; // returns new sale UUID
            })
        );
    }

    // Creating a sale would be a transaction (header + details)
    // For now, we focus on reading.
}
