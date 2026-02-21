import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  LoanSchedulerRecoveryDto,
  LoanSchedulerRecoveryFilterRequest,
  LoanSchedulerSaveRequest
} from '../models/recovery-posting.models';
import { RepaymentScheduleRowDto } from '../models/loan-repayment-summary.models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class RecoveryPostingService {
  private readonly baseUrl = `${environment.apiUrl}/LoanSchedulers`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getLoanSchedulersForRecovery(filter: LoanSchedulerRecoveryFilterRequest): Observable<LoanSchedulerRecoveryDto[]> {
    let params = new HttpParams().set('scheduleDate', filter.scheduleDate);

    if (filter.branchId != null) {
      params = params.set('branchId', filter.branchId.toString());
    }
    if (filter.centerId != null) {
      params = params.set('centerId', filter.centerId.toString());
    }
    if (filter.pocId != null) {
      params = params.set('pocId', filter.pocId.toString());
    }
    if (filter.pageNumber != null) {
      params = params.set('pageNumber', filter.pageNumber.toString());
    }
    if (filter.pageSize != null) {
      params = params.set('pageSize', filter.pageSize.toString());
    }

    return this.http.get<LoanSchedulerRecoveryDto[]>(`${this.baseUrl}/recovery`, {
      headers: this.getHeaders(),
      params
    });
  }

  /**
   * Unified save endpoint for single and bulk posting.
   * Pass an array with one item for single-row post, or N items for bulk post.
   */
  save(items: LoanSchedulerSaveRequest[]): Observable<{ updatedCount: number }> {
    return this.http.post<{ updatedCount: number }>(`${this.baseUrl}/save`, items, {
      headers: this.getHeaders()
    });
  }

  /**
   * Get repayment schedule rows for a single loan (by loan ID).
   * Used by Loan Repayment Summary page. Propagates errors; caller should handle empty and error cases.
   */
  getSchedulerByLoanId(loanId: number): Observable<RepaymentScheduleRowDto[]> {
    return this.http
      .get<RepaymentScheduleRowDto[] | LoanSchedulerRecoveryDto[]>(`${this.baseUrl}/loan/${loanId}`, {
        headers: this.getHeaders()
      })
      .pipe(
        map((rows) => (Array.isArray(rows) ? rows.map((r) => this.mapToRepaymentRow(r)) : [])),
        catchError((error) => {
          console.error(error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Map API response row to RepaymentScheduleRowDto.
   * UI Column → API Field: Week No ← installmentNo, Collection Date ← scheduleDate,
   * Paid Date ← paymentDate, Payment Status ← status, Paid Amount ← calculated sum,
   * Reasons ← comments.
   */
  private mapToRepaymentRow(r: RepaymentScheduleRowDto | LoanSchedulerRecoveryDto): RepaymentScheduleRowDto {
    if ('weekNo' in r && r.weekNo != null && !('installmentNo' in r)) {
      return {
        weekNo: r.weekNo,
        collectionDate: r.collectionDate ?? null,
        paidDate: r.paidDate ?? null,
        paymentStatus: r.paymentStatus ?? 'Not Paid',
        paidAmount: r.paidAmount ?? 0,
        reasons: r.reasons ?? null
      };
    }
    const dto = r as LoanSchedulerRecoveryDto & { paymentDate?: string };
    const status = dto.status === 'Partial' ? 'Partially Paid' : (dto.status ?? 'Not Paid');
    const rawPaidDate = dto.paymentDate ?? null;
    const paidDate = this.normalizePaidDate(rawPaidDate);
    const paidAmount =
      (dto.actualEmiAmount ?? 0) + (dto.actualInterestAmount ?? 0) + (dto.actualPrincipalAmount ?? 0);
    return {
      weekNo: dto.installmentNo ?? 0,
      collectionDate: dto.scheduleDate ?? null,
      paidDate,
      paymentStatus: status,
      paidAmount: Math.round(paidAmount * 100) / 100,
      reasons: dto.comments ?? null
    };
  }

  /** If paymentDate is default/min sentinel (e.g. 0001-01-01), return null so UI shows '-'. */
  private normalizePaidDate(value: string | null | undefined): string | null {
    if (value == null || value === '') return null;
    const v = String(value).trim();
    if (v === '' || v.startsWith('0001-01-01')) return null;
    return value;
  }
}

