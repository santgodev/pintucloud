import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Product } from '../../models/product.model';

@Injectable({
    providedIn: 'root'
})
export class InventoryService {
    constructor() { }

    getProducts(): Observable<any[]> {
        const products = [
            {
                name: 'Cemento Gris Uso General',
                brand: 'Argos',
                sku: 'CEM-G-50',
                category: 'Construcción',
                price: 28500,
                stock: 850,
                isActive: true,
                image: 'https://ui-avatars.com/api/?name=C&background=333&color=fff'
            },
            {
                name: 'Varilla Corrugada 1/2"',
                brand: 'Diaco',
                sku: 'VAR-12-6M',
                category: 'Acero',
                price: 18200,
                stock: 2400,
                isActive: true,
                image: null
            },
            {
                name: 'Taladro Percutor 1/2"',
                brand: 'DeWalt',
                sku: 'DWD-024',
                category: 'Herramientas',
                price: 350000,
                stock: 45,
                isActive: true,
                image: 'https://ui-avatars.com/api/?name=D&background=f59e0b&color=000'
            },
            {
                name: 'Pintura Vinilo Tipo 1',
                brand: 'Pintuco',
                sku: 'VIN-B-5G',
                category: 'Acabados',
                price: 95000,
                stock: 120,
                isActive: true,
                image: null
            },
            {
                name: 'Disco de Corte Metal 4 1/2"',
                brand: 'Abracol',
                sku: 'DIS-COR-45',
                category: 'Abrasivos',
                price: 4500,
                stock: 5000,
                isActive: true,
                image: null
            }
        ];
        // Simulate network delay
        return of(products).pipe(delay(500));
    }
}
