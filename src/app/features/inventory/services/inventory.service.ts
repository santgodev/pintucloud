import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs'; // removed map if not used in pipe, but it is used
import { map } from 'rxjs/operators';
import { SupabaseService } from '../../../core/services/supabase.service';

export interface InventoryItem {
    id: string; // inventario_bodega id
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

        if (error) {
            console.error(error);
            return [];
        }
        return data || [];
    }

    async getInventory(bodegaId?: string): Promise<Observable<InventoryItem[]>> {
        // 1. Get User Profile for Context
        const user = await this.supabase.auth.getUser();
        if (!user.data.user) return new Observable(obs => obs.next([]));

        const { data: profile } = await this.supabase
            .from('usuarios')
            .select('bodega_asignada_id, rol')
            .eq('id', user.data.user.id)
            .single();

        // 2. Build Query
        let query = this.supabase.from('inventario_bodega')
            .select(`
                id,
                cantidad,
                productos (id, nombre, sku, imagen_url, precio_base, categoria, descripcion),
                bodegas (id, nombre)
            `);

        // Apply filters
        if (bodegaId) {
            query = query.eq('bodega_id', bodegaId);
        } else if (profile?.rol === 'asesor' && profile?.bodega_asignada_id) {
            // Filter by assigned warehouse if Advisor and no specific filter selected
            query = query.eq('bodega_id', profile.bodega_asignada_id);
        }

        // 3. Execute and Map
        return from(query).pipe(
            map(({ data, error }) => {
                if (error) {
                    console.error('Error loading inventory', error);
                    return [];
                }

                return (data || []).map((item: any) => {
                    const quantity = item.cantidad;
                    let status: InventoryItem['status'] = 'In Stock';
                    if (quantity === 0) status = 'Out of Stock';
                    else if (quantity < 50) status = 'Low Stock';

                    return {
                        id: item.id,
                        productId: item.productos?.id,
                        productName: item.productos?.nombre,
                        sku: item.productos?.sku,
                        bodegaName: item.bodegas?.nombre,
                        stock: quantity,
                        price: item.productos?.precio_base,
                        imageUrl: item.productos?.imagen_url,
                        description: item.productos?.descripcion,
                        category: item.productos?.categoria,
                        status: status
                    };
                });
            })
        );
    }

    async createProduct(product: {
        name: string;
        sku: string;
        price: number;
        category: string;
        description?: string;
        imageUrl?: string;
    }, initialStock: number, targetBodegaId?: string): Promise<string> {

        // 1. Context
        const userResponse = await this.supabase.auth.getUser();
        const user = userResponse.data.user;

        if (!user) throw new Error('Usuario no autenticado');

        const { data: userData, error: userError } = await this.supabase
            .from('usuarios')
            .select('distribuidor_id, bodega_asignada_id')
            .eq('id', user.id)
            .single();

        if (userError || !userData) throw new Error('Error al obtener perfil');

        // default bodega logic
        let bodegaId = targetBodegaId || userData.bodega_asignada_id;
        if (!bodegaId) {
            // If admin, find first bodega
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
            imagen_url: product.imageUrl,
            categoria: product.category
        };

        const { data: prodData, error: prodError } = await this.supabase
            .from('productos')
            .insert(newProduct)
            .select()
            .single();

        if (prodError) throw prodError;

        // 3. Insert Inventory
        const inventoryItem = {
            bodega_id: bodegaId,
            producto_id: prodData.id,
            cantidad: initialStock
        };

        const { error: invError } = await this.supabase
            .from('inventario_bodega')
            .insert(inventoryItem);

        if (invError) {
            console.error('Error creating inventory, but product created', invError);
            // Optionally rollback product deletion?
        }

        return prodData.id;
    }

    async uploadProductImage(file: File): Promise<string> {
        const timestamp = Date.now();
        const fileExt = file.name.split('.').pop();
        const fileName = `${timestamp}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await this.supabase.storage
            .from('productos') // Bucket name assumed 'productos' based on previous context or convention
            .upload(filePath, file);

        if (uploadError) {
            console.error('Upload Error:', uploadError);
            throw new Error('Error al subir la imagen');
        }

        const { data } = this.supabase.storage
            .from('productos')
            .getPublicUrl(filePath);

        return data.publicUrl;
    }
    async updateProduct(productData: any, newImageFile?: File): Promise<void> {
        // 1. Upload Image if exists
        let finalImageUrl = productData.imageUrl;
        if (newImageFile) {
            finalImageUrl = await this.uploadProductImage(newImageFile);
        }

        // 2. Update Product Info
        console.log('Updating product:', productData.productId, 'with image:', finalImageUrl);
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

        if (prodError) {
            console.error('Error actualizando producto en DB:', prodError);
            throw new Error(`No se pudo actualizar el producto: ${prodError.message}`);
        }

        // 3. Update Custom Stock (for the specific inventory item ID)
        if (productData.inventoryId && productData.stock !== undefined) {
            const { error: invError } = await this.supabase
                .from('inventario_bodega')
                .update({ cantidad: productData.stock })
                .eq('id', productData.inventoryId);

            if (invError) throw invError;
        }
    }
}
