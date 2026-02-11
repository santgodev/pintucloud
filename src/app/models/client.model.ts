export interface Client {
    id: string;
    name: string;
    businessName?: string; // Razón Social
    nit: string; // Tax ID
    address: string;
    phone: string;
    email: string;
    zoneId: string;
    location: {
        lat: number;
        lng: number;
    };
    contactPerson?: string;
    lastPurchaseDate?: Date | string; // serialized
    visitFrequencyDays?: number; // e.g. every 7 days
    status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
    notes?: string;
    assignedSellerId?: string;
}
