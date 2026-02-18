export interface User {
  id?: number;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  email?: string;
  level?: string;
  role?: string;
  organizationId?: number;
  branchId?: number | null;
  isActive?: boolean;
  [key: string]: unknown;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  email?: string;
  password?: string;
  level: string;
  role: string;
  organizationId: number;
  branchId?: number | null;
  isActive?: boolean;
}
