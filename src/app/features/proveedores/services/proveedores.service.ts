import { Injectable } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Proveedor, ProveedorFormPayload } from '../models/proveedor.model';

@Injectable({ providedIn: 'root' })
export class ProveedoresService {

    constructor(private supabase: SupabaseService) { }

    async getAll(): Promise<Proveedor[]> {
        const { data, error } = await this.supabase
            .from('proveedores')
            .select('id, nombre, nit, telefono, email, ciudad, estado, puede_comprar, created_at, updated_at, distribuidor_id, contacto_principal, direccion')
            .order('nombre');

        if (error) throw new Error(error.message);
        return (data || []) as Proveedor[];
    }

    async getById(id: string): Promise<Proveedor> {
        const { data, error } = await this.supabase
            .from('proveedores')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw new Error(error.message);
        return data as Proveedor;
    }

    private translateError(msg: string): string {
        if (msg.includes('uq_proveedor_nit_distribuidor') || msg.includes('duplicate key')) {
            return 'Ya existe un proveedor con ese NIT en tu empresa. El NIT debe ser único.';
        }
        return msg;
    }

    async create(payload: ProveedorFormPayload): Promise<string> {
        const { data, error } = await this.supabase
            .from('proveedores')
            .insert({
                nombre: payload.nombre,
                nit: payload.nit || null,
                telefono: payload.telefono || null,
                email: payload.email || null,
                direccion: payload.direccion || null,
                ciudad: payload.ciudad || null,
                contacto_principal: payload.contacto_principal || null,
                estado: 'ACTIVO',
                puede_comprar: payload.puede_comprar ?? true,
            })
            .select('id')
            .single();

        if (error) throw new Error(this.translateError(error.message));
        return data.id;
    }

    async update(id: string, payload: ProveedorFormPayload): Promise<void> {
        const { error } = await this.supabase
            .from('proveedores')
            .update({
                nombre: payload.nombre,
                nit: payload.nit || null,
                telefono: payload.telefono || null,
                email: payload.email || null,
                direccion: payload.direccion || null,
                ciudad: payload.ciudad || null,
                contacto_principal: payload.contacto_principal || null,
                puede_comprar: payload.puede_comprar,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) throw new Error(this.translateError(error.message));
    }

    async toggleEstado(id: string, nuevoEstado: 'ACTIVO' | 'INACTIVO'): Promise<void> {
        const { error } = await this.supabase
            .from('proveedores')
            .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw new Error(error.message);
    }
}
