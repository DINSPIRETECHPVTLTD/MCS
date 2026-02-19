export interface Organization {
  id?: number;
  name: string;
  /** Display: use phoneNumber from API or this if set */
  phone?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  email?: string;
  /** Single-line display address; built from address1, address2, city, state, zipCode when loading from API */
  address?: string;
  /** API fields (GET api/Organizations returns these) */
  address1?: string;
  address2?: string;
  phoneNumber?: string;
  [key: string]: unknown;
}
