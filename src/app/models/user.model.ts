export type UserRole = 'admin_distribuidor' | 'asesor' | 'ADMIN' | 'SELLER' | 'WAREHOUSE_MANAGER';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  zones?: string[]; // IDs of zones this user is assigned to
  isActive: boolean;
  companyId: string;
  distribuidor_id: string; // Maintain compatibility
  lastLogin?: Date;
}
