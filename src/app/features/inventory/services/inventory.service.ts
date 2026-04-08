import { Injectable } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { SupabaseService } from '../../../core/services/supabase.service';

export interface InventoryItem {
    id: string;
    productId: string;
    productName: string;
    sku: string;
    bodegaId: string;
    bodegaName: string;
    stock: number;
    price: number;          // mantenido por compatibilidad (= precio_base)
    priceSale: number;      // precio de venta (precio_base)
    pricePurchase: number;  // precio de compra (precio_compra)
    inventoryValue: number; // cantidad * precio_compra
    imageUrl: string;
    description?: string;
    category?: string;
    stockMinimo?: number;
    status: 'En Stock' | 'Bajo Stock' | 'Agotado';
    order?: number | null;
    grupo?: string;
    visible_catalogo?: boolean;
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

    async getBodegasByDistribuidor(distribuidorId: string): Promise<any[]> {
        const { data, error } = await this.supabase
            .from('bodegas')
            .select('*')
            .eq('distribuidor_id', distribuidorId);
        if (error) { console.error(error); return []; }
        return data || [];
    }

    async getCategories(): Promise<string[]> {
        const { data, error } = await this.supabase
            .from('productos')
            .select('categoria')
            .eq('activo', true)
            .order('categoria');

        if (error) {
            console.error('Error fetching categories:', error);
            return [];
        }

        const categories = data.map((item: any) => item.categoria).filter((c: any) => c);
        return [...new Set(categories)] as string[];
    }

    async getGrupos(): Promise<string[]> {
        const { data, error } = await this.supabase
            .from('productos')
            .select('grupo')
            .eq('activo', true);

        if (error) {
            console.error('Error fetching grupos:', error);
            return [];
        }

        const gruposLimpios = data
            .map((g: any) => (g.grupo || '').trim().toUpperCase())
            .filter((g: string) => g.length > 0);

        return [...new Set(gruposLimpios)].sort();
    }

    async getInventory(bodegaId?: string, lowStock?: boolean): Promise<Observable<InventoryItem[]>> {
        // 1. Get User Profile for Context
        const user = await this.supabase.auth.getUser();
        if (!user.data.user) return new Observable(obs => obs.next([]));

        const { data: profile } = await this.supabase
            .from('usuarios')
            .select('bodega_asignada_id, rol, distribuidor_id')
            .eq('id', user.data.user.id)
            .single();

        // 2. Build Query starting from 'productos' to ensure ALL are included
        let query = this.supabase.from('productos')
            .select(`
                id,
                nombre,
                sku,
                imagen_url,
                precio_base,
                precio_compra,
                orden,
                categoria,
                descripcion,
                stock_minimo,
                grupo,
                visible_catalogo,
                activo,
                inventario_bodega (id, cantidad, bodega_id, bodegas(id, nombre))
            `);

        // Filter active only for non-admins or as default
        query = query.eq('activo', true);

        // Apply commercial ordering
        query = query.order('orden', { ascending: true });

        // 3. Execute and Map
        return from(query).pipe(
            map(({ data, error }) => {
                if (error) {
                    console.error('Error loading inventory from products', error);
                    return [];
                }

                const resultItems: InventoryItem[] = [];
                const targetBodegaId = bodegaId || (profile?.rol === 'asesor' ? profile?.bodega_asignada_id : null);

                (data || []).forEach((prod: any) => {
                    const priceSale = prod.precio_base || 0;
                    const pricePurchase = prod.precio_compra || 0;
                    let invRecords = prod.inventario_bodega || [];

                    // Filter by target bodega if provided
                    if (targetBodegaId) {
                        invRecords = invRecords.filter((inv: any) => inv.bodega_id === targetBodegaId);
                    }

                    if (invRecords.length === 0) {
                        // Product exists but NOT matching the targeted bodega (or no record at all)
                        // Interpretation: stock = 0
                        resultItems.push({
                            id: '', 
                            productId: prod.id,
                            productName: prod.nombre,
                            sku: prod.sku,
                            bodegaId: targetBodegaId || '',
                            bodegaName: targetBodegaId ? 'Sin Stock' : 'Sin Bodega',
                            stock: 0,
                            price: priceSale,
                            priceSale,
                            pricePurchase,
                            inventoryValue: 0,
                            stockMinimo: prod.stock_minimo,
                            imageUrl: prod.imagen_url,
                            description: prod.descripcion,
                            category: prod.categoria,
                            status: 'Agotado',
                            order: prod.orden ?? null,
                            grupo: prod.grupo,
                            visible_catalogo: prod.visible_catalogo
                        });
                    } else {
                        // Return one item per bodega record
                        invRecords.forEach((inv: any) => {
                            const quantity = inv.cantidad ?? 0;
                            const minStock = prod.stock_minimo || 0;

                            let status: InventoryItem['status'] = 'En Stock';
                            if (quantity === 0) status = 'Agotado';
                            else if (quantity <= minStock) status = 'Bajo Stock';

                            resultItems.push({
                                id: inv.id,
                                productId: prod.id,
                                productName: prod.nombre,
                                sku: prod.sku,
                                bodegaId: inv.bodega_id,
                                bodegaName: inv.bodegas?.nombre || 'Bodega',
                                stock: quantity,
                                price: priceSale,
                                priceSale,
                                pricePurchase,
                                inventoryValue: quantity * pricePurchase,
                                stockMinimo: prod.stock_minimo,
                                imageUrl: prod.imagen_url,
                                description: prod.descripcion,
                                category: prod.categoria,
                                status: status,
                                order: prod.orden ?? null,
                                grupo: prod.grupo,
                                visible_catalogo: prod.visible_catalogo
                            });
                        });
                    }
                });

                // Final filtering for lowStock if requested
                let filtered = resultItems;

                // Sort by commercial order and then by bodega
                filtered.sort((a, b) => {
                    const orderA = a.order ?? 9999;
                    const orderB = b.order ?? 9999;
                    if (orderA !== orderB) return orderA - orderB;
                    return (a.bodegaName || '').localeCompare(b.bodegaName || '');
                });

                if (lowStock) {
                    filtered = filtered.filter(item => item.stock <= (item.stockMinimo || 0));
                }

                return filtered;
            })
        );
    }

    async createProduct(product: {
        name: string;
        sku: string;
        price: number;
        category: string;
        stock_minimo?: number;
        description?: string;
        imageUrl?: string;
        grupo?: string;
        visible_catalogo?: boolean;
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

        // 2. Insert Product
        const newProduct = {
            sku: product.sku,
            nombre: product.name,
            descripcion: product.description || '',
            precio_base: product.price,
            stock_minimo: product.stock_minimo || 0,
            imagen_url: product.imageUrl,
            categoria: product.category,
            distribuidor_id: userData.distribuidor_id,
            grupo: product.grupo || null,
            visible_catalogo: product.visible_catalogo ?? false
        };

        const { data: prodData, error: prodError } = await this.supabase
            .from('productos')
            .insert(newProduct)
            .select()
            .single();

        if (prodError) throw prodError;

        if (initialStock && initialStock > 0) {
            const { error: invError } = await this.supabase.rpc('registrar_movimiento', {
                p_producto_id: prodData.id,
                p_bodega_id: bodegaId,
                p_tipo_movimiento: 'INICIAL',
                p_cantidad: initialStock,
                p_referencia_id: null
            });

            if (invError) throw invError;
        }

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

        // 2. Update Product Info
        const { error: prodError } = await this.supabase
            .from('productos')
            .update({
                nombre: productData.name,
                precio_base: productData.price,
                stock_minimo: productData.stock_minimo || 0,
                descripcion: productData.description,
                imagen_url: finalImageUrl,
                categoria: productData.category,
                grupo: productData.grupo || null,
                visible_catalogo: productData.visible_catalogo ?? false
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

    async adjustInventory(
        productoId: string,
        bodegaId: string,
        diferencia: number,
        motivo: string
    ) {
        const { error } = await this.supabase.rpc('registrar_movimiento', {
            p_producto_id: productoId,
            p_bodega_id: bodegaId,
            p_tipo_movimiento: 'AJUSTE',
            p_cantidad: diferencia,
            p_referencia_id: null,
            p_observacion: motivo
        });

        if (error) {
            console.error('Error ajustando inventario:', error);
            throw error;
        }
    }

    async registerInitialInventory(productoId: string, bodegaId: string, cantidad: number) {
        const { error } = await this.supabase.rpc('registrar_movimiento', {
            p_producto_id: productoId,
            p_bodega_id: bodegaId,
            p_tipo_movimiento: 'INICIAL',
            p_cantidad: cantidad,
            p_referencia_id: null,
            p_observacion: 'Carga inicial de inventario'
        });

        if (error) {
            console.error('Error registrando inventario inicial:', error);
            throw error;
        }
    }

    async deleteProduct(productId: string): Promise<{ success: boolean, method: 'deleted' | 'inactivated' }> {
        // 1. Check if there is stock in any warehouse
        const { data: invData, error: invError } = await this.supabase
            .from('inventario_bodega')
            .select('cantidad')
            .eq('producto_id', productId);

        if (invError) throw invError;

        const totalStock = (invData || []).reduce((acc: number, curr: any) => acc + (Number(curr.cantidad) || 0), 0);

        if (totalStock > 0) {
            throw new Error(`No se puede eliminar ni inactivar el producto porque aún tiene ${totalStock} unidades en inventario. Por favor agote el stock o realice un ajuste de salida primero.`);
        }

        // 2. First, try hard delete. If it has transactions, it will fail due to FK constraints.
        const { error: deleteError } = await this.supabase
            .from('productos')
            .delete()
            .eq('id', productId);

        if (!deleteError) {
            return { success: true, method: 'deleted' };
        }

        // 3. If it failed due to FK, it's likely code 23503 (Foreign Key Violation)
        // In that case, we "soft delete" by setting activo = false
        const { error: updateError } = await this.supabase
            .from('productos')
            .update({ activo: false })
            .eq('id', productId);

        if (updateError) throw updateError;

        return { success: true, method: 'inactivated' };
    }
}
