/** Matches LoanSchedulers table / GET api/LoanSchedulers/loan/{loanId} and /recovery response. */
export interface LoanSchedulerRecoveryDto {
  loanSchedulerId: number;
  loanId: number;
  scheduleDate: string;
  /** When paid; may be "9999-01-01..." when not paid. */
  paymentDate?: string | null;
  installmentNo: number;
  paymentAmount: number;
  status: string;
  comments?: string | null;
  actualEmiAmount?: number | null;
  actualInterestAmount?: number | null;
  actualPrincipalAmount?: number | null;
  /** Recovery listing only: member/center/poc and amounts. */
  memberId?: number;
  memberName?: string;
  centerName?: string;
  parentPocName?: string;
  interestAmount?: number;
  principalAmount?: number;
  due?: number;
  principalPercentage?: number;
  interestPercentage?: number;
}

export interface LoanSchedulerRecoveryFilterRequest {
  scheduleDate: string;
  branchId?: number;
  centerId?: number;
  pocId?: number;
  pageNumber?: number;
  pageSize?: number;
}

export interface LoanSchedulerSaveRequest {
  loanSchedulerId: number;
  status?: string;
  paymentMode: string;
  paymentAmount: number;
  principalAmount: number;
  interestAmount: number;
  comments: string;
  collectedBy?: number;
}

