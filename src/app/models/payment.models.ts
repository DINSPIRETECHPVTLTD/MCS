export interface Payment {
  id: number;
  paymentTermName: string;
  paymentType: string;
  noOfTerms: number;
  processingFee?: number;
  rateOfInterest?: number;
  insuranceFee?: number;
  isDeleted: boolean;
}

/** DTO for creating/updating payment terms in the API */
export interface CreatePaymentTermDto {
  paymentTerm: string;
  paymentType: string;
  noOfTerms: number;
  processingFee?: number;
  rateOfInterest?: number;
  insuranceFee?: number;
}

/** DTO received from the API */
export interface PaymentTermResponseDto {
  paymentTermId: number;
  paymentTerm: string;
  paymentType: string;
  noOfTerms: number;
  processingFee?: number;
  rateOfInterest?: number;
  insuranceFee?: number;
  isDeleted: boolean;
}
