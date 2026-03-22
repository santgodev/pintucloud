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
}
