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
}

export interface CreateCompraPayload {
    proveedor_id: string;
    bodega_id: string;           // bodega única para toda la compra
    numero_factura?: string | null;
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

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class PurchasesService {

    constructor(private supabase: SupabaseService) { }

    /** Trae todas las compras con proveedor */
    async getAll(): Promise<Compra[]> {
        const { data, error } = await this.supabase
            .from('compras')
            .select(`
        *,
        proveedores (nombre)
      `)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return (data || []) as Compra[];
    }

    /** Trae una compra completa con detalle + nombres de producto (bodega en cabecera) */
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

    /** Actualiza la cabecera de una compra BORRADOR (sin tocar líneas de detalle) */
    async updateCompra(id: string, payload: Partial<CreateCompraPayload>): Promise<void> {
        const fields: Record<string, unknown> = {};
        if (payload.proveedor_id !== undefined) fields['proveedor_id'] = payload.proveedor_id;
        if (payload.bodega_id !== undefined) fields['bodega_id'] = payload.bodega_id;
        if (payload.numero_factura !== undefined) fields['numero_factura'] = payload.numero_factura || null;
        if (payload.observacion !== undefined) fields['observacion'] = payload.observacion || null;
        if (payload.condicion_pago !== undefined) fields['condicion_pago'] = payload.condicion_pago;
        if (payload.dias_credito !== undefined) fields['dias_credito'] = payload.dias_credito;

        const { error } = await this.supabase
            .from('compras')
            .update(fields)
            .eq('id', id);

        if (error) throw new Error(error.message);
    }

    /** Agrega una línea de detalle a una compra BORRADOR. Retorna el id real de DB. */
    async addDetail(payload: CreateDetallePayload): Promise<string> {
        // subtotal es GENERATED ALWAYS en DB — no se envía desde frontend
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

    /** Elimina completamente una compra BORRADOR via RPC (incluye detalle en cascada) */
    async deleteBorrador(id: string): Promise<void> {
        const { error } = await this.supabase
            .rpc('eliminar_compra_borrador', { p_compra_id: id });

        if (error) throw new Error(error.message);
    }

    /**
     * Confirma la compra llamando la RPC confirmar_compra.
     * La lógica de actualizar inventario vive en la base de datos.
     */
    async confirm(compraId: string): Promise<void> {
        const { error } = await this.supabase.rpc('confirmar_compra', {
            p_compra_id: compraId,
        });

        if (error) throw new Error(error.message);
    }

    /** Anula una compra CONFIRMADA via RPC (revierte el inventario) */
    async anularCompra(id: string): Promise<void> {
        const { error } = await this.supabase
            .rpc('anular_compra', { p_compra_id: id });

        if (error) throw new Error(error.message);
    }

    /** Trae proveedores disponibles para compras: ACTIVO y habilitados (puede_comprar = true) */
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

    /** Trae las bodegas disponibles para el dropdown */
    async getBodegas(): Promise<{ id: string; nombre: string }[]> {
        const { data, error } = await this.supabase
            .from('bodegas')
            .select('id, nombre')
            .eq('activo', true)
            .order('nombre');

        if (error) throw new Error(error.message);
        return data || [];
    }

    /** Trae los productos para el dropdown en el detalle */
    async getProductos(): Promise<{ id: string; nombre: string; sku: string; precio_base: number }[]> {
        const { data, error } = await this.supabase
            .from('productos')
            .select('id, nombre, sku, precio_base')
            .order('nombre');

        if (error) throw new Error(error.message);
        return data || [];
    }
}
