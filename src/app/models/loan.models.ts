/**
 * Loan data models
 */

export interface ActiveLoanSummaryDto {
  loanId: number;
  memberName: string;
  noOfTerms: number;
  numberOfPaidEmis: number;
  totalPaidAmount: number;
  totalUnpaidAmount: number;
  totalAmount: number;
}

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

/** One row in the week-wise repayment schedule (read-only). */
export interface RepaymentScheduleRow {
  weekNo: number;
  collectionDate: string;
  paidDate?: string | null;
  paymentStatus: string;
  paidAmount: number;
  reasons?: string | null;
}

/** Optional backend DTO when API returns summary + schedule. */
export interface RepaymentSummaryDto {
  totalAmountPaid: number;
  remainingBalance: number;
  weeklyDue: number;
  scheduleRows?: RepaymentScheduleRow[];
}
