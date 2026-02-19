import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Payment, CreatePaymentTermDto, PaymentTermResponseDto } from '../models/payment.models';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private readonly baseUrl = `${environment.apiUrl}/paymentterms`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /** Map API response to frontend Payment interface */
  private mapFromApi(dto: PaymentTermResponseDto): Payment {
    return {
      id: dto.paymentTermId,
      paymentTermName: dto.paymentTerm,
      paymentType: dto.paymentType,
      noOfTerms: dto.noOfTerms,
      processingFee: dto.processingFee,
      rateOfInterest: dto.rateOfInterest,
      insuranceFee: dto.insuranceFee,
      isDeleted: dto.isDeleted
    };
  }

  /** Map frontend Payment to API DTO */
  private mapToApi(payment: Payment): CreatePaymentTermDto {
    return {
      paymentTerm: payment.paymentTermName,
      paymentType: payment.paymentType,
      noOfTerms: payment.noOfTerms,
      processingFee: payment.processingFee,
      rateOfInterest: payment.rateOfInterest,
      insuranceFee: payment.insuranceFee
    };
  }

  getPayments(): Observable<Payment[]> {
    return this.http
      .get<PaymentTermResponseDto[]>(this.baseUrl, { headers: this.getHeaders() })
      .pipe(map(dtos => dtos.map(dto => this.mapFromApi(dto))));
  }

  addPayment(payment: Payment): Observable<Payment> {
    const dto = this.mapToApi(payment);
    return this.http
      .post<PaymentTermResponseDto>(this.baseUrl, dto, { headers: this.getHeaders() })
      .pipe(map(responseDto => this.mapFromApi(responseDto)));
  }

  updatePayment(id: number, payment: Payment): Observable<void> {
    const dto = this.mapToApi(payment);
    return this.http.put<void>(`${this.baseUrl}/${id}`, dto, { headers: this.getHeaders() });
  }

  deletePayment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`, { headers: this.getHeaders() });
  }
}
