import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError } from 'rxjs';
import { of } from 'rxjs';
import { Payment } from '../models/payment.models';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

// Shape returned by the Payment Terms API (api/paymentterms)
interface ApiPayment {
  paymentTermId: number;
  paymentTerm: string;
  paymentType: string | null;
  noOfTerms: number;
  processingFee: number | null;
  rateOfInterest: number | null;
  insuranceFee: number | null;
  isDeleted: boolean;
}

/** API may return a direct array or .NET wrapped shape like { $values: [] } */
type PaymentsApiResponse = ApiPayment[] | { $values?: ApiPayment[]; data?: ApiPayment[] };

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  /** All CRUD via api/paymentterms (GET, POST, PUT, DELETE). */
  private readonly baseUrl = `${environment.apiUrl}/paymentterms`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Map backend ApiPayment -> frontend Payment model for display.
   * Handles both camelCase and PascalCase (e.g. .NET JSON serializer).
   */
  private mapFromApi(p: Record<string, unknown>): Payment {
    const id = p['paymentTermId'] ?? p['PaymentTermId'];
    const paymentTerm = (p['paymentTerm'] ?? p['PaymentTerm'] ?? '') as string;
    const paymentType = (p['paymentType'] ?? p['PaymentType'] ?? '') as string;
    const noOfTerms = p['noOfTerms'] ?? p['NoOfTerms'] ?? 0;
    const processingFee = p['processingFee'] ?? p['ProcessingFee'];
    const rateOfInterest = p['rateOfInterest'] ?? p['RateOfInterest'];
    const insuranceFee = p['insuranceFee'] ?? p['InsuranceFee'];
    return {
      id: typeof id === 'number' ? id : Number(id) || 0,
      paymentTerm: paymentTerm as Payment['paymentTerm'],
      paymentType: paymentType != null ? String(paymentType) : '',
      noOfTerms: typeof noOfTerms === 'number' ? noOfTerms : Number(noOfTerms) || 0,
      processingFee: processingFee != null ? String(processingFee) : '',
      roi: rateOfInterest != null ? String(rateOfInterest) : '',
      insuranceFee: insuranceFee != null ? String(insuranceFee) : ''
    };
  }

  /**
   * Map frontend Payment -> backend ApiPayment shape for create/update.
   * Only includes fields the API cares about; IsDeleted is handled server-side.
   */
  private mapToApi(payment: Partial<Payment>): Partial<ApiPayment> {
    return {
      paymentTerm: payment.paymentTerm ?? '',
      paymentType: payment.paymentType != null && payment.paymentType !== '' ? payment.paymentType : null,
      noOfTerms: payment.noOfTerms != null ? Number(payment.noOfTerms) : 0,
      processingFee:
        payment.processingFee != null && payment.processingFee !== ''
          ? Number(payment.processingFee)
          : null,
      rateOfInterest:
        payment.roi != null && payment.roi !== ''
          ? Number(payment.roi)
          : null,
      insuranceFee:
        payment.insuranceFee != null && payment.insuranceFee !== ''
          ? Number(payment.insuranceFee)
          : null
    };
  }

  /**
   * Extract array from API response (handles direct array or .NET $values / data wrapper).
   */
  private extractPaymentArray(response: PaymentsApiResponse | null | undefined): ApiPayment[] {
    if (response == null) return [];
    if (Array.isArray(response)) return response;
    if (typeof response === 'object') {
      const arr = (response as { $values?: ApiPayment[] }).$values ?? (response as { data?: ApiPayment[] }).data;
      return Array.isArray(arr) ? arr : [];
    }
    return [];
  }

  /**
   * Get payments from API and map backend fields to frontend Payment model.
   * Handles wrapped responses ($values / data) and skips invalid rows.
   */
  getPayments(): Observable<Payment[]> {
    return this.http
      .get<PaymentsApiResponse>(this.baseUrl, { headers: this.getHeaders() })
      .pipe(
        map((response) => {
          const list = this.extractPaymentArray(response);
          return list
            .filter((p): p is ApiPayment => p != null && typeof p === 'object')
            .map((p) => {
              try {
                return this.mapFromApi(p as unknown as Record<string, unknown>);
              } catch {
                return null;
              }
            })
            .filter((p): p is Payment => p != null);
        }),
        catchError(() => of([]))
      );
  }

  /**
   * Create a new payment: send RateOfInterest (not roi) etc. so EF/Core maps correctly.
   */
  addPayment(payment: Omit<Payment, 'id'>): Observable<Payment> {
    const body = this.mapToApi(payment);
    return this.http
      .post<ApiPayment | null>(this.baseUrl, body, { headers: this.getHeaders() })
      .pipe(
        map((p) => {
          if (p != null && typeof p === 'object') {
            return this.mapFromApi(p as unknown as Record<string, unknown>);
          }
          const raw = p as unknown as Record<string, unknown> | null | undefined;
          const id = raw?.['paymentTermId'] ?? raw?.['PaymentTermId'];
          return this.buildPaymentFromPayload(typeof id === 'number' ? id : Number(id) || 0, payment);
        })
      );
  }

  /**
   * Update existing payment: same mapping as addPayment, but sent as partial.
   * If the API returns no body (e.g. 204), we build the Payment from the request.
   */
  updatePayment(id: number, payment: Partial<Payment>): Observable<Payment> {
    const body = this.mapToApi(payment);
    return this.http
      .put<ApiPayment | null>(`${this.baseUrl}/${id}`, body, { headers: this.getHeaders() })
      .pipe(
        map((p) => {
          if (p != null && typeof p === 'object') {
            return this.mapFromApi(p as unknown as Record<string, unknown>);
          }
          return this.buildPaymentFromPayload(id, payment);
        })
      );
  }

  private buildPaymentFromPayload(id: number, payment: Partial<Payment>): Payment {
    const term = payment.paymentTerm;
    const paymentTerm: Payment['paymentTerm'] =
      term === 'Daily' || term === 'Weekly' || term === 'Monthly' ? term : 'Daily';
    return {
      id,
      paymentTerm,
      paymentType: payment.paymentType ?? '',
      noOfTerms: payment.noOfTerms ?? 0,
      processingFee: payment.processingFee ?? '',
      roi: payment.roi ?? '',
      insuranceFee: payment.insuranceFee ?? ''
    };
  }

  deletePayment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`, { headers: this.getHeaders() });
  }
}
