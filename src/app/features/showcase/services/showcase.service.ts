import { Injectable } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { SupabaseService } from '../../../core/services/supabase.service';

export interface Product {
    id: string;
    name: string;
    category: string;
    sku?: string;
    price: number;
    description: string;
    imageUrl: string;
    features: string[];
    isNew?: boolean;
    isFeatured?: boolean;
    stock: number;
}

export interface Category {
    id: string;
    name: string;
    icon: string;
}

@Injectable({
    providedIn: 'root'
})
export class ShowcaseService {

    private categories: Category[] = [
        { id: 'rodillos', name: 'Rodillos', icon: 'format_paint' },
        { id: 'brochas', name: 'Brochas', icon: 'brush' },
        { id: 'accesorios', name: 'Accesorios', icon: 'build_circle' },
        { id: 'proteccion', name: 'Protección', icon: 'shield' }
    ];

    constructor(private supabase: SupabaseService) { }

    getCategories(): Observable<Category[]> {
        return from([this.categories]); // Wraps in Observable
    }

    getProducts(categoryId?: string): Observable<Product[]> {
        let query = this.supabase.from('productos').select(`
            *,
            inventario_bodega (
                cantidad
            )
        `)
            .order('categoria', { ascending: true })
            .order('nombre', { ascending: true });

        if (categoryId && categoryId !== 'all') {
            query = query.eq('categoria', categoryId);
        }

        return from(query).pipe(
            map(({ data, error }) => {
                if (error) {
                    console.error('Error fetching products:', error);
                    return [];
                }
                return (data || []).map((item: any) => {
                    // Sum stock from all warehouses
                    const stock = (item.inventario_bodega || []).reduce((acc: number, inv: any) => acc + (inv.cantidad || 0), 0);

                    return {
                        id: item.id,
                        name: item.nombre,
                        category: item.categoria || 'general',
                        sku: item.sku,
                        price: item.precio_base,
                        description: item.descripcion,
                        imageUrl: item.imagen_url,
                        features: [], // TODO: Add features column to DB if needed
                        isNew: false,
                        isFeatured: item.destacado || false,
                        stock: stock
                    };
                });
            })
        );
    }

    getStock(productId: string): Observable<number> {
        return from(
            this.supabase.from('inventario_bodega')
                .select('cantidad')
                .eq('producto_id', productId)
        ).pipe(
            map(({ data, error }) => {
                if (error || !data || data.length === 0) return 0;
                // Sum all quantities across warehouses (though usually just one for now)
                return data.reduce((acc, item: any) => acc + (item.cantidad || 0), 0);
            })
        );
    }
}
