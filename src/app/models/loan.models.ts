/**
 * Loan data models
 */

export interface Loan {
  loanId?: number;
  loanCode: string;
  memberId: number;
  /** Member first name (when returned with loan list) */
  memberFirstName?: string;
  /** Member last name (when returned with loan list) */
  memberLastName?: string;
  /** Member full name (alternative when API returns single name field) */
  memberName?: string;
  loanAmount: number;
  interestAmount: number;
  processingFee: number;
  insuranceFee: number;
  isSavingEnabled: boolean;
  savingAmount: number;
}

export interface CreateLoanRequest {
  loanCode: string;
  memberId: number;
  loanAmount: number;
  interestAmount: number;
  processingFee: number;
  insuranceFee: number;
  isSavingEnabled: boolean;
  savingAmount: number;
}
