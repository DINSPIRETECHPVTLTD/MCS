export interface CreateFundTransferRequest {
  paidFromUserId: number;
  paidToUserId: number;
  amount: number;
  investmentDate: string;
}