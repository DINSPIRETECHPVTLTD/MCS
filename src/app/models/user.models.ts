export interface User {
  id?: number;
  firstName: string;
  middleName?: string;
  lastName: string;
  phoneNumber?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  email?: string;
  level?: string;
  role?: string;
  organizationId?: number;
  branchId?: number | null;
  [key: string]: unknown;
}

export interface CreateUserRequest {
  firstName: string;
  middleName?: string;
  lastName: string;
  phoneNumber?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  email?: string;
  password?: string;
  level: string;
  role: string;
  organizationId: number;
  branchId?: number | null;
}
