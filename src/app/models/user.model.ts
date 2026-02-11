export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'SELLER' | 'WAREHOUSE_MANAGER';
  avatarUrl?: string;
  zones?: string[]; // IDs of zones this user is assigned to
  isActive: boolean;
  companyId: string;
  lastLogin?: Date;
}
