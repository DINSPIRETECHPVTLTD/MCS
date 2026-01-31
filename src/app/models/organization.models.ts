export interface Organization {
  id?: number;
  name: string;
  phone?: string;
  city?: string;
  email?: string;
  address?: string;
  [key: string]: unknown;
}
