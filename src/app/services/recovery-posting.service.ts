import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  LoanSchedulerRecoveryDto,
  LoanSchedulerRecoveryFilterRequest,
  LoanSchedulerSaveRequest
} from '../models/recovery-posting.models';
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

  /**
   * GET api/LoanSchedulers/recovery
   * Returns one row per loan (next unpaid installment) for the given schedule date and optional branch/center/POC filters.
   */
  getLoanSchedulersForRecovery(filter: LoanSchedulerRecoveryFilterRequest): Observable<LoanSchedulerRecoveryDto[]> {
    let params = new HttpParams().set('scheduleDate', filter.scheduleDate);
    if (filter.branchId != null) params = params.set('branchId', filter.branchId.toString());
    if (filter.centerId != null) params = params.set('centerId', filter.centerId.toString());
    if (filter.pocId != null) params = params.set('pocId', filter.pocId.toString());
    if (filter.pageNumber != null) params = params.set('pageNumber', filter.pageNumber.toString());
    if (filter.pageSize != null) params = params.set('pageSize', filter.pageSize.toString());

    return this.http.get<LoanSchedulerRecoveryDto[]>(`${this.baseUrl}/recovery`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      timeout(15000),
      catchError(() => of([]))
    );
  }

  /**
   * GET api/LoanSchedulers/loan/{loanId}
   * Returns week-wise schedule rows for the given loan (for Loan Repayment Summary).
   * Returns empty array on error or when no data exists.
   */
  getSchedulersByLoanId(loanId: number): Observable<LoanSchedulerRecoveryDto[]> {
    return this.http.get<LoanSchedulerRecoveryDto[] | { $values?: LoanSchedulerRecoveryDto[] }>(
      `${this.baseUrl}/loan/${loanId}`,
      { headers: this.getHeaders() }
    ).pipe(
      timeout(15000),
      map((response: LoanSchedulerRecoveryDto[] | { $values?: LoanSchedulerRecoveryDto[] }) => {
        if (Array.isArray(response)) return response;
        if (response && typeof response === 'object' && '$values' in response && Array.isArray((response as { $values?: LoanSchedulerRecoveryDto[] }).$values))
          return (response as { $values: LoanSchedulerRecoveryDto[] }).$values;
        return [];
      }),
      catchError(() => of([]))
    );
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
}

