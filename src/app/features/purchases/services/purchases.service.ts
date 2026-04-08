import { Injectable } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Proveedor {
    id: string;
    nombre: string;
    nit?: string;
    contacto?: string;
    telefono?: string;
}

export interface CompraDetalle {
    id?: string;
    compra_id?: string;
    producto_id: string;
    cantidad: number;
    precio_unitario: number;
    subtotal?: number;        // GENERATED en DB, solo lectura
    // joined
    productos?: { nombre: string; sku: string };
}

export interface PagoProveedor {
    id: string;
    compra_id: string;
    monto: number;
    metodo_pago: string;
    fecha_pago: string;
    observacion?: string;
    tipo_movimiento: 'PAGO' | 'REVERSO';
    usuario_id: string;
    pago_referencia_id?: string; // ID del pago original si es un reverso
    usuarios?: { nombre: string };
    created_at: string;
}

export interface Compra {
    id?: string;
    distribuidor_id?: string;
    proveedor_id: string;
    bodega_id?: string;
    numero_factura?: string;
    fecha?: string;
    estado?: 'BORRADOR' | 'CONFIRMADA' | 'ANULADA';
    total?: number;
    observacion?: string;
    condicion_pago?: 'CONTADO' | 'CREDITO';
    dias_credito?: number | null;
    fecha_vencimiento?: string;
    fecha_anulacion?: string;    // Fecha en que se anuló la compra
    created_at?: string;
    updated_at?: string;
    // joined
    proveedores?: { nombre: string; nit?: string };
    bodegas?: { nombre: string };
    compras_detalle?: CompraDetalle[];
    cuentas_por_pagar?: {
        id: string;
        saldo_actual: number;
        estado: string;
        fecha_vencimiento: string;
    }[];
}

export interface CreateCompraPayload {
    proveedor_id: string;
    bodega_id: string;           // bodega única para toda la compra
    numero_factura?: string | null;
    fecha?: string | null;
    observacion?: string | null;
    condicion_pago: 'CONTADO' | 'CREDITO';
    dias_credito: number | null;
}

export interface CreateDetallePayload {
    compra_id: string;
    producto_id: string;
    cantidad: number;
    precio_unitario: number;
}

export interface PurchasesQueryParams {
    page: number;
    pageSize: number;
    search?: string;
    estado?: 'BORRADOR' | 'CONFIRMADA' | 'ANULADA' | '';
    fechaDesde?: string;
    fechaHasta?: string;
    bodegaId?: string;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class PurchasesService {

    constructor(private supabase: SupabaseService) { }

    /** Trae todas las compras (obsoleto, usar getPurchases para paginación) */
    async getAll(): Promise<Compra[]> {
        const { data, error } = await this.supabase
            .from('compras')
            .select(`
        *,
        proveedores (nombre),
        bodegas (nombre)
      `)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return (data || []) as Compra[];
    }

    /** Trae compras con paginación y filtros */
    async getPurchases(params: PurchasesQueryParams) {
        const from = params.page * params.pageSize;
        const to = from + params.pageSize - 1;

        let query = this.supabase
            .from('compras')
            .select(`
                *,
                proveedores!inner(nombre),
                bodegas(nombre),
                cuentas_por_pagar (
                    id,
                    saldo_actual,
                    estado,
                    fecha_vencimiento
                )
            `, { count: 'exact' });

        if (params.search && params.search.trim() !== '') {
            const value = params.search.trim();
            if (/^[0-9#\-_]+$/.test(value)) {
                query = query.ilike('numero_factura', `%${value}%`);
            } else {
                query = query.ilike('proveedores.nombre', `%${value}%`);
            }
        }

        if (params.estado) {
            query = query.eq('estado', params.estado);
        }

        if (params.bodegaId) {
            query = query.eq('bodega_id', params.bodegaId);
        }

        if (params.fechaDesde) {
            query = query.gte('created_at', params.fechaDesde);
        }

        if (params.fechaHasta) {
            const endOfDay = `${params.fechaHasta}T23:59:59.999Z`;
            query = query.lte('created_at', endOfDay);
        }

        const sortField = params.sortField || 'created_at';
        const sortDir = params.sortDirection || 'desc';

        if (sortField === 'proveedores.nombre') {
            query = query.order('nombre', { foreignTable: 'proveedores', ascending: sortDir === 'asc' });
        } else {
            query = query.order(sortField, { ascending: sortDir === 'asc' });
        }

        query = query.range(from, to);

        const { data, error, count } = await query;
        if (error) throw error;

        return {
            data: data as Compra[],
            total: count ?? 0
        };
    }

    /** Trae una compra completa con detalle + nombres de producto */
    async getById(id: string): Promise<Compra> {
        const { data, error } = await this.supabase
            .from('compras')
            .select(`
                id, proveedor_id, bodega_id, numero_factura, fecha, estado, total, observacion, 
                condicion_pago, dias_credito, fecha_vencimiento, fecha_anulacion, created_at, updated_at,
                proveedores (nombre, nit),
                bodegas     (nombre),
                compras_detalle (
                  id, producto_id, cantidad, precio_unitario, subtotal,
                  productos (nombre, sku)
                ),
                cuentas_por_pagar (
                    id,
                    saldo_actual,
                    estado,
                    fecha_vencimiento
                )
            `)
            .eq('id', id)
            .single();

        if (error) throw new Error(error.message);
        return (data as unknown) as Compra;
    }

    /** Crea una compra en estado BORRADOR */
    async create(payload: CreateCompraPayload): Promise<string> {
        const { data, error } = await this.supabase
            .from('compras')
            .insert({
                proveedor_id: payload.proveedor_id,
                bodega_id: payload.bodega_id,
                numero_factura: payload.numero_factura || null,
                fecha: payload.fecha || null,
                observacion: payload.observacion || null,
                estado: 'BORRADOR',
                condicion_pago: payload.condicion_pago,
                dias_credito: payload.dias_credito,
            })
            .select('id')
            .single();

        if (error) throw new Error(error.message);
        return data.id;
    }

    /** Actualiza la cabecera de una compra BORRADOR */
    async updateCompra(id: string, payload: Partial<CreateCompraPayload>): Promise<void> {
        const fields: Record<string, unknown> = {};
        if (payload.proveedor_id !== undefined) fields['proveedor_id'] = payload.proveedor_id;
        if (payload.bodega_id !== undefined) fields['bodega_id'] = payload.bodega_id;
        if (payload.numero_factura !== undefined) fields['numero_factura'] = payload.numero_factura || null;
        if (payload.fecha !== undefined) fields['fecha'] = payload.fecha || null;
        if (payload.observacion !== undefined) fields['observacion'] = payload.observacion || null;
        if (payload.condicion_pago !== undefined) fields['condicion_pago'] = payload.condicion_pago;
        if (payload.dias_credito !== undefined) fields['dias_credito'] = payload.dias_credito;

        const { error } = await this.supabase
            .from('compras')
            .update(fields)
            .eq('id', id);

        if (error) throw new Error(error.message);
    }

    /** Agrega una línea de detalle */
    async addDetail(payload: CreateDetallePayload): Promise<string> {
        const { data, error } = await this.supabase
            .from('compras_detalle')
            .insert({
                compra_id: payload.compra_id,
                producto_id: payload.producto_id,
                cantidad: payload.cantidad,
                precio_unitario: payload.precio_unitario,
            })
            .select('id')
            .single();

        if (error) throw new Error(error.message);
        return data.id;
    }

    /** Elimina una línea de detalle */
    async removeDetail(detalleId: string): Promise<void> {
        const { error } = await this.supabase
            .from('compras_detalle')
            .delete()
            .eq('id', detalleId);

        if (error) throw new Error(error.message);
    }

    /** Elimina completamente una compra BORRADOR */
    async deleteBorrador(id: string): Promise<void> {
        const { error } = await this.supabase
            .rpc('eliminar_compra_borrador', { p_compra_id: id });

        if (error) throw new Error(error.message);
    }

    /** Confirma la compra */
    async confirm(compraId: string): Promise<void> {
        const { error } = await this.supabase.rpc('confirmar_compra', {
            p_compra_id: compraId,
        });

        if (error) throw new Error(error.message);
    }

    /** Anula una compra CONFIRMADA */
    async anularCompra(id: string): Promise<void> {
        const { error } = await this.supabase
            .rpc('anular_compra', { p_compra_id: id });

        if (error) throw new Error(error.message);
    }

    /** Registra un pago a un proveedor */
    async registrarPago(params: {
        compraId: string;
        monto: number;
        metodo: string;
        observacion?: string;
    }): Promise<void> {
        const { error } = await this.supabase.rpc('registrar_pago_proveedor', {
            p_compra_id: params.compraId,
            p_monto: params.monto,
            p_metodo_pago: params.metodo,
            p_observacion: params.observacion || null
        });

        if (error) throw new Error(error.message);
    }

    /** Trae proveedores activos */
    async getProveedores(): Promise<Proveedor[]> {
        const { data, error } = await this.supabase
            .from('proveedores')
            .select('id, nombre, nit')
            .eq('estado', 'ACTIVO')
            .eq('puede_comprar', true)
            .order('nombre');

        if (error) throw new Error(error.message);
        return (data || []) as Proveedor[];
    }

    /** Trae bodegas activas */
    async getBodegas(): Promise<{ id: string; nombre: string }[]> {
        const { data, error } = await this.supabase
            .from('bodegas')
            .select('id, nombre')
            .eq('activo', true)
            .order('nombre');

        if (error) throw new Error(error.message);
        return data || [];
    }

    /** Trae productos con precio base */
    async getProductos(): Promise<{ id: string; nombre: string; sku: string; precio_base: number }[]> {
        const { data, error } = await this.supabase
            .from('productos')
            .select('id, nombre, sku, precio_base')
            .eq('activo', true)
            .order('nombre');

        if (error) throw new Error(error.message);
        return data || [];
    }

    /** Obtiene el historial de pagos (estilo Cartera) */
    async getPagosByCompra(compraId: string): Promise<PagoProveedor[]> {
        const { data, error } = await this.supabase
            .from('pagos_proveedores')
            .select(`
                id,
                monto,
                metodo_pago,
                fecha_pago,
                observacion,
                tipo_movimiento,
                usuario_id,
                pago_referencia_id,
                created_at
            `)
            .eq('compra_id', compraId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []) as any[];
    }

    /** Reversa un pago realizado a proveedor */
    async reversarPago(pagoId: string): Promise<void> {
        const { error } = await this.supabase.rpc('reversar_pago_proveedor', {
            p_pago_id: pagoId,
            p_observacion: 'Reverso desde UI'
        });

        if (error) {
            console.error('Error al reversar pago:', error);
            throw new Error(error.message);
        }
    }

    /** Obtiene un resumen financiero de las cuentas por pagar desde el backend */
    async getFinancialSummary(): Promise<{ totalDeuda: number; vencidas: number; alDia: number }> {
        try {
            const { data, error } = await this.supabase.rpc('get_cartera_resumen', {});

            if (error) throw error;

            // Retornar el primer (y único) registro del resumen
            return {
                totalDeuda: Number(data?.[0]?.total_pendiente || 0),
                vencidas: Number(data?.[0]?.facturas_vencidas || 0),
                alDia: Number(data?.[0]?.facturas_al_dia || 0)
            };
        } catch (error) {
            console.error('Error al obtener resumen de cartera:', error);
            return { totalDeuda: 0, vencidas: 0, alDia: 0 };
        }
    }
}
