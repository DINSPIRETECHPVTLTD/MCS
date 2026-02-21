/**
 * Models for Loan Repayment Summary (read-only view under Manage Loan).
 */

/** One row in the week-wise repayment schedule grid. */
export interface RepaymentScheduleRowDto {
  /** Week/installment number (1-based, sequential per Payment Term). */
  weekNo: number;
  /** Collection date for this installment. */
  collectionDate: string | null;
  /** Date when payment was recorded (Recovery Posting / Prepayment); null if not paid. */
  paidDate: string | null;
  /** Paid | Not Paid | Partially Paid */
  paymentStatus: string;
  /** Amount paid for this installment; 0 when not paid. */
  paidAmount: number;
  /** Reason for non-payment or partial payment (optional). */
  reasons: string | null;
}
