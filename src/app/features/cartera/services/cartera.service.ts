import { Injectable } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';

export interface CarteraItem {
    venta_id: string;
    numero_factura: number | null;
    fecha: string;
    cliente: string;
    total_factura: number;
    saldo_pendiente: number;
    fecha_vencimiento: string;
    estado: string; // PENDIENTE, PARCIAL, PAGADA, ANULADA
    vendedor: string;
}

export interface CarteraQueryParams {
    search?: string;
    estado?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    asesorId?: string;
}

@Injectable({
    providedIn: 'root'
})
export class CarteraService {

    constructor(private supabase: SupabaseService) { }

    async getCartera(params?: CarteraQueryParams): Promise<CarteraItem[]> {
        let query = this.supabase
            .from('cuentas_por_cobrar')
            .select(`
                venta_id,
                saldo_actual,
                fecha_vencimiento,
                estado,
                ventas!inner (
                    numero_factura,
                    fecha,
                    fecha_autorizacion,
                    total,
                    usuario_id,
                    usuarios (
                        nombre_completo
                    )
                ),
                clientes!inner (
                    razon_social
                )
            `)
            .neq('estado', 'ANULADA');

        if (params) {
            if (params.search && params.search.trim() !== '') {
                const value = params.search.trim();
                const isNumber = !isNaN(Number(value));

                if (isNumber) {
                    query = query.eq('ventas.numero_factura', Number(value));
                } else {
                    query = query.ilike('clientes.razon_social', `%${value}%`);
                }
            }

            if (params.estado && params.estado !== '') {
                query = query.eq('estado', params.estado);
            }

            if (params.fechaDesde) {
                query = query.gte('ventas.fecha', params.fechaDesde);
            }

            if (params.fechaHasta) {
                query = query.lte('ventas.fecha', params.fechaHasta);
            }

            if (params.asesorId && params.asesorId !== '') {
                query = query.eq('ventas.usuario_id', params.asesorId);
            }
        }

        query = query.order('fecha_vencimiento', { ascending: true });

        const { data, error } = await query;


        if (error) {
            console.error('Error fetching cartera:', error);
            throw error;
        }

        return (data || []).map((item: any) => ({
            venta_id: item.venta_id,
            numero_factura: item.ventas?.numero_factura || null,
            fecha: item.ventas?.fecha_autorizacion || item.ventas?.fecha || '',
            cliente: item.clientes?.razon_social || 'Cliente Desconocido',
            total_factura: item.ventas?.total || 0,
            saldo_pendiente: item.saldo_actual,
            fecha_vencimiento: item.fecha_vencimiento,
            estado: item.estado,
            vendedor: item.ventas?.usuarios?.nombre_completo || 'Sistema'
        }));
    }

    async registrarPago(ventaId: string, monto: number, metodo: string, observacion?: string): Promise<void> {
        const { error } = await this.supabase.rpc('registrar_pago_cartera', {
            p_venta_id: ventaId,
            p_monto: monto,
            p_metodo_pago: metodo,
            p_observacion: observacion || null
        });

        if (error) {
            console.error('Error registering payment:', error);
            throw error;
        }
    }
}
