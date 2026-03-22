import { Injectable } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { SupabaseService } from '../../../core/services/supabase.service';

export interface Warehouse {
    id: string;
    nombre: string;
    codigo: string;
    direccion: string | null;
    activo: boolean;
    maneja_inventario: boolean;
    distribuidor_id: string;
    created_at: string;
    productos_distintos?: number;
    total_unidades?: number;
    estado?: string;
}

@Injectable({ providedIn: 'root' })
export class WarehousesService {

    constructor(private supabase: SupabaseService) { }

    createWarehouse(nombre: string, codigo: string, direccion: string | null, manejaInventario: boolean) {
        return this.supabase.rpc('crear_bodega', {
            p_nombre: nombre,
            p_codigo: codigo,
            p_direccion: direccion,
            p_maneja_inventario: manejaInventario
        });
    }

    getWarehouses(): Observable<Warehouse[]> {
        const query = this.supabase
            .from('bodegas')
            .select(`
        *,
        inventario_bodega (
          cantidad,
          producto_id
        )
      `)
            .order('nombre');

        return from(query).pipe(
            map(({ data, error }) => {
                if (error) throw new Error(error.message);

                return (data || []).map((b: any) => {
                    const lines: any[] = b.inventario_bodega ?? [];
                    const total_unidades = lines.reduce((sum: number, l: any) => sum + (l.cantidad || 0), 0);
                    const productos_distintos = lines.length;

                    return {
                        id: b.id,
                        nombre: b.nombre,
                        codigo: b.codigo,
                        direccion: b.direccion ?? null,
                        activo: b.activo ?? true,
                        maneja_inventario: b.maneja_inventario ?? true,
                        distribuidor_id: b.distribuidor_id,
                        created_at: b.created_at,
                        productos_distintos,
                        total_unidades,
                        estado: b.activo ? 'ACTIVA' : 'INACTIVA',
                    } as Warehouse;
                });
            })
        );
    }
}
