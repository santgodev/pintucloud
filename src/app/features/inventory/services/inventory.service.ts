import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SupabaseService } from '../../../core/services/supabase.service';

export interface InventoryItem {
    id: string;
    productId: string;
    productName: string;
    sku: string;
    bodegaName: string;
    stock: number;
    price: number;
    imageUrl: string;
    description?: string;
    category?: string;
    status: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

@Injectable({
    providedIn: 'root'
})
export class InventoryService {

    constructor(private supabase: SupabaseService) { }

    async getBodegas(): Promise<any[]> {
        const { data, error } = await this.supabase
            .from('bodegas')
            .select('*');
        if (error) { console.error(error); return []; }
        return data || [];
    }

    async getInventory(bodegaId?: string): Promise<Observable<InventoryItem[]>> {
        // 1. Perfil de usuario
        const user = await this.supabase.auth.getUser();
        if (!user.data.user) return new Observable(obs => obs.next([]));

        const { data: profile } = await this.supabase
            .from('usuarios')
            .select('bodega_asignada_id, rol, distribuidor_id')
            .eq('id', user.data.user.id)
            .single();

        // 2. Bodega a filtrar
        let targetBodegaId: string | null = null;
        if (bodegaId) {
            targetBodegaId = bodegaId;
        } else if (profile?.rol === 'asesor' && profile?.bodega_asignada_id) {
            targetBodegaId = profile.bodega_asignada_id;
        }

        // 3. Query inventario_bodega SIN joins (los joins pueden ser bloqueados por RLS)
        let invQuery = this.supabase
            .from('inventario_bodega')
            .select('id, cantidad, bodega_id, producto_id');

        if (targetBodegaId) {
            invQuery = invQuery.eq('bodega_id', targetBodegaId);
        }

        const { data: invData, error: invError } = await invQuery;

        if (invError) {
            console.error('[Inventory] Error en inventario_bodega:', invError);
            return new Observable(obs => obs.next([]));
        }

        if (!invData || invData.length === 0) {
            console.warn('[Inventory] Sin registros en inventario_bodega');
            return new Observable(obs => obs.next([]));
        }

        // 4. IDs únicos
        const productoIds = [...new Set(invData.map((i: any) => i.producto_id as string))];
        const bodegaIds = [...new Set(invData.map((i: any) => i.bodega_id as string))];

        // 5. Queries independientes a productos y bodegas
        const [prodResult, bodResult] = await Promise.all([
            this.supabase
                .from('productos')
                .select('id, nombre, sku, imagen_url, precio_base, categoria, descripcion')
                .in('id', productoIds),
            this.supabase
                .from('bodegas')
                .select('id, nombre')
                .in('id', bodegaIds)
        ]);

        // 🔍 DIAGNÓSTICO DETALLADO
        console.group('🔍 [Inventory] Diagnóstico de Supabase');
        console.log('📦 inventario_bodega rows:', invData.length);
        console.log('🔑 producto_ids a buscar:', productoIds.length, productoIds.slice(0, 3));

        if (prodResult.error) {
            console.error('❌ ERROR en tabla productos:');
            console.error('   Código:', prodResult.error.code);
            console.error('   Mensaje:', prodResult.error.message);
            console.error('   Detalle:', prodResult.error.details);
            console.error('   Hint:', prodResult.error.hint);
            if (prodResult.error.code === '42501') {
                console.error('   ⚠️ CAUSA: RLS (Row Level Security) bloqueando SELECT en productos');
            }
        } else {
            console.log('✅ productos encontrados:', prodResult.data?.length ?? 0);
            if (prodResult.data?.length === 0) {
                console.warn('⚠️ La query NO da error pero devuelve 0 filas — posible RLS silencioso');
            }
        }

        if (bodResult.error) {
            console.error('❌ ERROR en tabla bodegas:', bodResult.error.code, bodResult.error.message);
        } else {
            console.log('✅ bodegas encontradas:', bodResult.data?.length ?? 0);
        }
        console.groupEnd();

        // 6. Mapas para lookup O(1)
        const prodMap = new Map<string, any>((prodResult.data || []).map((p: any) => [p.id, p]));
        const bodMap = new Map<string, any>((bodResult.data || []).map((b: any) => [b.id, b]));

        // 7. Merge manual
        const items: InventoryItem[] = invData.map((item: any) => {
            const prod = prodMap.get(item.producto_id);
            const bod = bodMap.get(item.bodega_id);
            const qty = Number(item.cantidad);

            let status: InventoryItem['status'] = 'In Stock';
            if (qty === 0) status = 'Out of Stock';
            else if (qty < 50) status = 'Low Stock';

            return {
                id: item.id,
                productId: item.producto_id,
                productName: prod?.nombre ?? '(sin nombre)',
                sku: prod?.sku ?? '',
                bodegaName: bod?.nombre ?? '',
                stock: qty,
                price: Number(prod?.precio_base ?? 0),
                imageUrl: prod?.imagen_url ?? '',
                description: prod?.descripcion ?? '',
                category: prod?.categoria ?? '',
                status
            } as InventoryItem;
        });

        return new Observable(obs => { obs.next(items); obs.complete(); });
    }

    async createProduct(product: {
        name: string;
        sku: string;
        price: number;
        category: string;
        description?: string;
        imageUrl?: string;
    }, initialStock: number, targetBodegaId?: string): Promise<string> {

        const userResponse = await this.supabase.auth.getUser();
        const user = userResponse.data.user;
        if (!user) throw new Error('Usuario no autenticado');

        const { data: userData, error: userError } = await this.supabase
            .from('usuarios')
            .select('distribuidor_id, bodega_asignada_id')
            .eq('id', user.id)
            .single();

        if (userError || !userData) throw new Error('Error al obtener perfil');

        let bodegaId = targetBodegaId || userData.bodega_asignada_id;
        if (!bodegaId) {
            const { data: bodegas } = await this.supabase
                .from('bodegas')
                .select('id')
                .eq('distribuidor_id', userData.distribuidor_id)
                .limit(1);
            if (bodegas && bodegas.length > 0) bodegaId = bodegas[0].id;
        }

        if (!bodegaId) throw new Error('No hay bodega asignada para el inventario');

        const { data: prodData, error: prodError } = await this.supabase
            .from('productos')
            .insert({
                sku: product.sku,
                nombre: product.name,
                descripcion: product.description || '',
                precio_base: product.price,
                imagen_url: product.imageUrl,
                categoria: product.category,
                distribuidor_id: userData.distribuidor_id
            })
            .select()
            .single();

        if (prodError) throw prodError;

        const { error: invError } = await this.supabase
            .from('inventario_bodega')
            .insert({ bodega_id: bodegaId, producto_id: prodData.id, cantidad: initialStock });

        if (invError) console.error('Error creating inventory:', invError);

        return prodData.id;
    }

    async uploadProductImage(file: File): Promise<string> {
        const timestamp = Date.now();
        const fileExt = file.name.split('.').pop();
        const filePath = `products/${timestamp}.${fileExt}`;

        const { error: uploadError } = await this.supabase.storage
            .from('productos')
            .upload(filePath, file);

        if (uploadError) throw new Error('Error al subir la imagen');

        const { data } = this.supabase.storage.from('productos').getPublicUrl(filePath);
        return data.publicUrl;
    }

    async updateProduct(productData: any, newImageFile?: File): Promise<void> {
        let finalImageUrl = productData.imageUrl;
        if (newImageFile) finalImageUrl = await this.uploadProductImage(newImageFile);

        const { error: prodError } = await this.supabase
            .from('productos')
            .update({
                nombre: productData.name,
                precio_base: productData.price,
                descripcion: productData.description,
                imagen_url: finalImageUrl,
                categoria: productData.category
            })
            .eq('id', productData.productId);

        if (prodError) throw new Error(`No se pudo actualizar: ${prodError.message}`);

        if (productData.inventoryId && productData.stock !== undefined) {
            const { error: invError } = await this.supabase
                .from('inventario_bodega')
                .update({ cantidad: productData.stock })
                .eq('id', productData.inventoryId);
            if (invError) throw invError;
        }
    }
}
