/**
 * Loan data models
 */

export interface Loan {
  loanId?: number;
  loanCode: string;
  memberId: number;
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
