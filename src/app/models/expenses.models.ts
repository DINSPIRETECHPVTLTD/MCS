export interface Expenses {
  id: number;
  paidFromUserId: number;
  amount: number;
  comment: string;
  paymentDate: string;
}

export interface CreateExpenseRequest {
  userId: number;
  amount: number;
  comment: string;
  expenseDate: string;
}