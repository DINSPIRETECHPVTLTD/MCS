export interface Branch {
  id: number;
  name: string;
  country?: string;
  code?: string;
  address?: string;
  city?: string;
  [key: string]: unknown;
}

export interface CreateBranchRequest {
  name: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  phoneNumber?: string;
  organizationId?: number;
}
