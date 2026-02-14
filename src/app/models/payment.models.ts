export interface Payment {
  id: number;
  paymentTerm: 'Daily' | 'Weekly' | 'Monthly';
  noOfTerms: number;
  processingFee: string;
  roi: string;
  insuranceFee: string;
}
