export interface Payment {
  id: number;
  paymentTerm: 'Daily' | 'Weekly' | 'Monthly';
  paymentType: string;
  noOfTerms: number;
  processingFee: string;
  roi: string;
  insuranceFee: string;
}
