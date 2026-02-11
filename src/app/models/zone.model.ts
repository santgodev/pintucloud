export interface Zone {
    id: string;
    name: string;
    code: string;
    center: {
        lat: number;
        lng: number;
    };
    isActive: boolean;
    region?: string; // e.g. "Andina", "Caribe"
    createdAt: Date;
}
