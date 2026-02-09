/**
 * Master Lookup – matches backend MasterLookup / MasterLookups table
 */

/** Category keys for lookups (match backend LookupKeys) */
export const LookupKeys = {
  LoanTerm: 'LOAN_TERM',
  PaymentType: 'PAYMENT_TYPE'
} as const;

export type LookupKeyType = typeof LookupKeys[keyof typeof LookupKeys] | string;

export interface MasterLookup {
  id?: number;
  lookupKey: string;
  lookupCode: string;
  lookupValue: string;
  numericValue?: number | null;
  sortOrder: number;
  isActive: boolean;
  description?: string | null;
  createdOn?: string;
  createdBy?: string | null;
  updatedOn?: string | null;
  updatedBy?: string | null;
}

export interface CreateMasterLookupRequest {
  lookupKey: string;
  lookupCode: string;
  lookupValue: string;
  numericValue?: number | null;
  sortOrder: number;
  isActive: boolean;
  description?: string | null;
}
