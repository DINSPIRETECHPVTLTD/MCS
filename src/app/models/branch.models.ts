export interface Branch {
  id: number;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  [key: string]: any;
}

export interface CreateBranchRequest {
  name: string;
  code?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  organizationId?: number;
}
