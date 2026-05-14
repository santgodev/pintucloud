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
    observaciones?: string;
    tipo_documento?: number;
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
        const { data, error } = await this.supabase.rpc('obtener_cartera_completa', {
            p_search: params?.search || '',
            p_estado: params?.estado || '',
            p_fecha_desde: params?.fechaDesde || null,
            p_fecha_hasta: params?.fechaHasta || null,
            p_asesor_id: params?.asesorId || null
        });

        if (error) {
            console.error('Error fetching cartera via RPC:', error);
            throw error;
        }

        return data as CarteraItem[];
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

    async cargarFacturaAntigua(payload: any): Promise<void> {
        const { error } = await this.supabase.rpc('cargar_factura_antigua', {
            p_cliente_id: payload.cliente_id,
            p_numero_factura_manual: payload.numero_factura_manual,
            p_fecha: payload.fecha,
            p_total: payload.total,
            p_items: payload.items,
            p_dias_credito: payload.dias_credito,
            p_observaciones: payload.observaciones
        });

        if (error) {
            console.error('Error charging old invoice:', error);
            throw error;
        }
    }

    async actualizarFacturaAntigua(ventaId: string, payload: any): Promise<void> {
        const { error } = await this.supabase.rpc('actualizar_factura_antigua', {
            p_venta_id: ventaId,
            p_cliente_id: payload.cliente_id,
            p_numero_factura_manual: payload.numero_factura_manual,
            p_fecha: payload.fecha,
            p_total: payload.total,
            p_items: payload.items,
            p_dias_credito: payload.dias_credito,
            p_observaciones: payload.observaciones
        });

        if (error) {
            console.error('Error al actualizar factura antigua:', error);
            throw error;
        }
    }

    /**
     * Devuelve las facturas que tuvieron pagos registrados por un asesor
     * en un rango de fechas. Usa fecha_pago (NO fecha de la factura).
     * Exclusivo para el drill-down desde Recaudos Diarios del dashboard.
     */
    async getFacturasConPagosPeriodo(
        asesorId: string,
        fechaDesde: string,
        fechaHasta: string
    ): Promise<CarteraItem[]> {
        const { data, error } = await this.supabase.rpc('obtener_facturas_con_pagos_periodo', {
            p_asesor_id: asesorId,
            p_fecha_desde: fechaDesde,
            p_fecha_hasta: fechaHasta
        });

        if (error) {
            console.error('Error fetching facturas con pagos periodo:', error);
            throw error;
        }

        return (data || []) as CarteraItem[];
    }
}
