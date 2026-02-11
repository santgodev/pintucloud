export interface SaleItem {
    productId: string;
    productName: string; // snapshot 
    quantity: number;
    unitPrice: number;
    taxAmount: number;
    total: number;
}

export interface Sale {
    id: string;
    code: string; // Human readable ID like INV-0001
    clientId: string;
    sellerId: string;
    warehouseId: string;
    createdAt: Date | string;
    totalItems: number;
    subtotal: number;
    totalTax: number;
    total: number;
    status: 'DRAFT' | 'CONFIRMED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
    paymentMethod: 'CASH' | 'TRANSFER' | 'CREDIT';
    items: SaleItem[];
    deliveryLocation?: {
        lat: number;
        lng: number;
        address: string;
    };
}
