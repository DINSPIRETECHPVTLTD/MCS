export interface Investments {
  id: number;
  userId: number;
  amount: number;
  investmentDate: string;
}

export interface CreateInvestmentRequest {
  userId: number;
  amount: number;
  investmentDate: string;
}