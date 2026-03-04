export interface Proveedor {
    id: string;
    distribuidor_id: string;
    nombre: string;
    nit: string | null;
    telefono: string | null;
    email: string | null;
    direccion: string | null;
    ciudad: string | null;
    contacto_principal: string | null;
    estado: 'ACTIVO' | 'INACTIVO';
    puede_comprar: boolean;
    created_at: string;
    updated_at: string;
}

export interface ProveedorFormPayload {
    nombre: string;
    nit?: string | null;
    telefono?: string | null;
    email?: string | null;
    direccion?: string | null;
    ciudad?: string | null;
    contacto_principal?: string | null;
    puede_comprar: boolean;
}
