import { Injectable } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';

@Injectable({
    providedIn: 'root'
})
export class DashboardService {
    constructor(private supabase: SupabaseService) { }

    async getVentasProductosMes() {
        const { data, error } = await this.supabase.rpc('ventas_productos_mes', {});
        if (error) throw error;
        return data || [];
    }

    async getVentasResumen() {
        const { data, error } = await this.supabase.rpc('ventas_resumen', {});
        if (error) throw error;
        return data; // Retorna: { ventas_hoy, ventas_ayer, variacion }
    }

    async getRecaudosPeriodo(fechaDesde: string, fechaHasta: string) {
        const { data, error } = await this.supabase.rpc('obtener_recaudos_periodo', {
            p_fecha_desde: fechaDesde,
            p_fecha_hasta: fechaHasta
        });
        if (error) {
            console.error('Error fetching recaudos periodo:', error);
            throw error;
        }
        return data || [];
    }

    async getDetallePagosPeriodo(fechaDesde: string, fechaHasta: string) {
        const { data, error } = await this.supabase.rpc('obtener_detalle_pagos_periodo', {
            p_fecha_desde: fechaDesde,
            p_fecha_hasta: fechaHasta
        });
        if (error) {
            console.error('Error fetching detailed payments:', error);
            throw error;
        }
        return data || [];
    }

    async getReporteComisiones(fechaDesde: string, fechaHasta: string) {
        const { data, error } = await this.supabase.rpc('obtener_reporte_comisiones', {
            p_fecha_desde: fechaDesde,
            p_fecha_hasta: fechaHasta
        });
        if (error) {
            console.error('Error fetching commissions report:', error);
            throw error;
        }
        return data || [];
    }
}
