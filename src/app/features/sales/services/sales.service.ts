import { Injectable } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { SupabaseService } from '../../../core/services/supabase.service';

export type SaleStatus = 'BORRADOR' | 'CONFIRMADA' | 'AUTORIZADO' | 'ANULADA';

export interface Sale {
    id: string;
    distribuidor_id: string;
    cliente_id: string;
    usuario_id: string;
    bodega_id: string;
    fecha: string;
    numero_factura: number | null;
    estado: SaleStatus;
    condicion_pago: 'CONTADO' | 'CREDITO';
    dias_credito: number | null;
    fecha_vencimiento: string | null;
    fecha_autorizacion: string | null;
    total: number;
    created_at: string;
    clientName?: string; // Virtual para UI
    vendedorName?: string; // Virtual para UI
}

export interface SaleItemInput {
    id?: string;
    venta_id: string;
    producto_id: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
}

export interface CreateSaleDraftPayload {
    cliente_id: string;
    metodo_pago: string;
    condicion_pago: 'CONTADO' | 'CREDITO';
    dias_credito: number | null;
    fecha: string; // YYYY-MM-DD
    bodega_id: string;
    tipo_documento: number; // 1 = Facturación electrónica, 2 = Orden de venta
    descuento_porcentaje?: number; // 0, 3, 5, 10... (default: 0)
}

export interface SalesQueryParams {
    page: number;
    pageSize: number;
    search?: string;
    estado?: 'BORRADOR' | 'CONFIRMADA' | 'ANULADA' | '';
    fechaDesde?: string;
    fechaHasta?: string;
    asesorId?: string;
    bodegaId?: string;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
}

@Injectable({
    providedIn: 'root'
})
export class SalesService {

    constructor(private supabase: SupabaseService) { }

    /** Versión Profesional con Paginación y Filtros Reales */
    async anularVenta(id: string) {
        const { data, error } = await this.supabase
            .rpc('anular_venta', { p_venta_id: id });

        if (error) throw error;
        return data;
    }

    async getSales(params: SalesQueryParams) {
        const from = params.page * params.pageSize;
        const to = from + params.pageSize - 1;
        const search = params.search;

        let query = this.supabase
            .from('ventas')
            .select(`
                id,
                numero_factura,
                fecha,
                total,
                estado,
                bodega_id,
                usuario_id,
                bodegas(nombre),
                clientes(razon_social, codigo),
                usuarios(nombre_completo, rol)
            `, { count: 'exact' });

        if (search && search.trim() !== '') {
            const value = search.trim();
            const isNumber = !isNaN(Number(value));

            if (isNumber) {
                query = query.eq('numero_factura', Number(value));
            } else {
                // Re-inicializamos con !inner solo para búsqueda de texto
                query = this.supabase
                    .from('ventas')
                    .select(`
                        id,
                        numero_factura,
                        fecha,
                        total,
                        estado,
                        bodega_id,
                        usuario_id,
                        bodegas(nombre),
                        clientes!inner(razon_social, codigo),
                        usuarios(nombre_completo, rol)
                    `, { count: 'exact' })
                    .ilike('clientes.razon_social', `%${value}%`) as any;
            }
        }

        /* filtros normales */
        if (params.estado) {
            query = query.eq('estado', params.estado);
        }

        if (params.fechaDesde) {
            query = query.gte('fecha', params.fechaDesde);
        }

        if (params.fechaHasta) {
            query = query.lte('fecha', params.fechaHasta);
        }

        if (params.asesorId) {
            query = query.eq('usuario_id', params.asesorId);
        }

        if (params.bodegaId) {
            query = query.eq('bodega_id', params.bodegaId);
        }

        /* 🔥 ORDER Y RANGE SIEMPRE AL FINAL */
        if (params.sortField) {
            if (params.sortField === 'clientName') {
                query = query.order('razon_social', { foreignTable: 'clientes', ascending: params.sortDirection === 'asc' });
            } else {
                query = query.order(params.sortField, { ascending: params.sortDirection === 'asc' });
            }
        } else {
            query = query.order('fecha', { ascending: false });
        }

        query = query.range(from, to);

        const { data, error, count } = await query;

        if (error) throw error;

        return {
            data: (data || []).map((item: any) => ({
                ...item,
                clientName: item.clientes?.razon_social || 'Cliente Desconocido',
                vendedorName: item.usuarios?.nombre_completo || 'Sistema',
                bodegaName: item.bodegas?.nombre || '—'
            })),
            total: count ?? 0
        };
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

    /** Obtener ventas por rango de fechas (sin paginación) */
    getSalesByDateRange(start: string, end: string) {
        return this.supabase
            .from('ventas')
            .select(`
                id,
                fecha,
                estado,
                total,
                numero_factura,
                cliente:clientes(razon_social)
            `)
            .gte('fecha', start)
            .lte('fecha', end)
            .order('fecha', { ascending: false });
    }


    /** 1. Crear Venta en estado BORRADOR */
    async createDraft(payload: CreateSaleDraftPayload): Promise<string> {
        const { cliente_id, metodo_pago, condicion_pago, dias_credito, fecha, bodega_id, tipo_documento, descuento_porcentaje } = payload;

        // Validación defensiva
        if (![1, 2].includes(tipo_documento)) {
            throw new Error('Tipo de documento inválido. Debe ser 1 (Facturación electrónica) o 2 (Orden de venta).');
        }

        const { data, error } = await this.supabase.rpc(
            'crear_venta_borrador',
            {
                p_cliente_id: cliente_id,
                p_metodo_pago: metodo_pago,
                p_condicion_pago: condicion_pago,
                p_dias_credito: dias_credito,
                p_fecha: fecha,
                p_bodega_id: bodega_id,
                p_tipo_documento: tipo_documento,
                p_descuento_porcentaje: descuento_porcentaje ?? 0
            }
        );

        if (error) throw error;

        const ventaId = data;
        return ventaId;
    }

    /** 2. Insertar Detalle */
    async addDetails(items: SaleItemInput[]): Promise<void> {
        const { error } = await this.supabase
            .from('detalle_ventas')
            .insert(items);

        if (error) throw error;
    }

    /** 3. Confirmar Venta (RPC) */
    async confirmSale(ventaId: string): Promise<void> {
        const { error } = await this.supabase.rpc('confirmar_venta', {
            p_venta_id: ventaId
        });

        if (error) {
            // Manejo específico de stock insuficiente u otros errores de negocio del RPC
            if (error.message.includes('stock_insuficiente')) {
                throw new Error('Stock insuficiente para completar la venta.');
            }
            throw error;
        }
    }

    /** Revertir venta confirmada a BORRADOR para permitir edición */
    async revertirVenta(id: string): Promise<void> {
        const { error } = await this.supabase.rpc('revertir_venta_a_borrador', {
            p_venta_id: id
        });
        if (error) throw error;
    }

    /** 4. Autorizar Venta (Cambio de estado) */
    async authorizeSale(ventaId: string): Promise<void> {
        const { error } = await this.supabase
            .from('ventas')
            .update({ 
                estado: 'AUTORIZADO',
                fecha_autorizacion: new Date().toISOString()
            })
            .eq('id', ventaId);

        if (error) throw error;
    }

  /** 5. Obtener Venta Completa (para el recibo) */
    async getById(id: string): Promise<Sale> {
        const { data, error } = await this.supabase
            .from('ventas')
            .select(`
                id,
                distribuidor_id,
                cliente_id,
                usuario_id,
                bodega_id,
                fecha,
                numero_factura,
                estado,
                condicion_pago,
                dias_credito,
                fecha_vencimiento,
                fecha_autorizacion,
                total,
                created_at,
                tipo_documento,
                descuento_porcentaje,
                descuento_valor,
                clientes (razon_social, telefono, direccion, ciudad, email, codigo),
                usuarios (nombre_completo),
                bodegas (nombre, codigo, direccion),
                cuentas_por_cobrar (fecha_vencimiento),
                detalle_ventas (
                    *,
                    productos (nombre, sku)
                )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        const raw = data as any;
        raw.clientName = raw.clientes?.razon_social;
        raw.vendedorName = raw.usuarios?.nombre_completo;
        
        // Si el campo directo de ventas viene nulo (viejas ventas?), intentar sacarlo de cartera
        if (!raw.fecha_vencimiento && raw.cuentas_por_cobrar) {
            // Manejar si viene como array o objeto dependiendo del tipo de relación en Supabase
            const cxc = Array.isArray(raw.cuentas_por_cobrar) ? raw.cuentas_por_cobrar[0] : raw.cuentas_por_cobrar;
            raw.fecha_vencimiento = cxc?.fecha_vencimiento;
        }
        
        return raw;
    }

    // Creating a sale would be a transaction (header + details)
    // For now, we focus on reading.
}
