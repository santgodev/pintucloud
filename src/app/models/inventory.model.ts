export interface Inventory {
    id: string;
    warehouseId: string;
    productId: string;
    stockLevel: number;
    reserved: number; // For pending orders
    available: number; // stockLevel - reserved
    lastMovementDate: Date;
    status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

export interface InventoryMovement {
    id: string;
    inventoryId: string;
    type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER';
    quantity: number;
    reason?: string;
    date: Date;
    userId: string;
}
