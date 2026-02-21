export interface UserTransactions {
  id: number;
  paidFromUserId: number;
  paidToUserId: number;
  amount: number;
  transactionDate: string;
  transactionType: string;
  createdBy: number;  // Optional for display
}