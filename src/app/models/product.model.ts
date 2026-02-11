export interface Product {
    id: string;
    sku: string;
    name: string;
    description: string;
    category: string;
    brand?: string;
    price: number;
    cost: number;
    unit: 'UN' | 'KG' | 'L' | 'M';
    imageUrl: string;
    tags?: string[];
    minStockThreshold: number;
    isActive: boolean;
}
