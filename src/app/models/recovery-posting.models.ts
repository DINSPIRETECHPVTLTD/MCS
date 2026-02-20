export interface LoanSchedulerRecoveryDto {
  loanSchedulerId: number;
  loanId: number;
  memberId: number;
  memberName: string;
  centerName: string;
  parentPocName: string;
  scheduleDate: string;
  installmentNo: number;
  interestAmount: number;
  principalAmount: number;
  paymentAmount: number;
  status: string;
  due: number;
  actualEmiAmount?: number | null;
  actualInterestAmount?: number | null;
  actualPrincipalAmount?: number | null;
  comments?: string | null;
  /** Principal share of EMI as percentage (from backend). Used for partial payment split. */
  principalPercentage?: number;
  /** Interest share of EMI as percentage (from backend). Used for partial payment split. */
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
  actualEmiAmount: number;
  actualInterestAmount: number;
  actualPrincipalAmount: number;
  comments: string;
  collectedBy?: number;
}

