export interface Warehouse {
    id: string;
    name: string;
    code: string;
    zoneId: string;
    address: string;
    contactPhone?: string;
    location: {
        lat: number;
        lng: number;
    };
    isActive: boolean;
    capacityM3?: number;
}
