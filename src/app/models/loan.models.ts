/**
 * Loan data models
 */

export interface Loan {
  id?: number;
  memberId: number;
  loanAmount: number;
  interestAmount: number;
  processingFee: number;
  insuranceFee: number;
  isSavingEnabled: boolean;
  savingAmount: number;
  totalAmount: number;
  status: string;
  disbursementDate?: string | null;
  closureDate?: string | null;
  collectionStartDate?: string | null;
  collectionTerm: string;
  noOfTerms: number;
  createdBy: number;
  createdAt: string;
  modifiedBy?: number | null;
  modifiedAt?: string | null;
  isDeleted: boolean;
}

export interface CreateLoanRequest {
  memberId: number;
  loanAmount: number;
  interestAmount: number;
  processingFee: number;
  insuranceFee: number;
  isSavingEnabled: boolean;
  savingAmount: number;
  totalAmount: number;
  disbursementDate?: string;
  collectionStartDate?: string;
  collectionTerm: string;
  noOfTerms: number;
}
