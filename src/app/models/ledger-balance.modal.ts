export interface LedgerBalances {
  id : number;
  userId : number;
  amount : number;
}

export interface CreateFundTransferRequest {
  userId : number;
  amount : number;
}