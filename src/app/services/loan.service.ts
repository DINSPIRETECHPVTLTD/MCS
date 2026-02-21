import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, timeout, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Loan, CreateLoanRequest, ActiveLoanSummaryDto } from '../models/loan.models';

@Injectable({
  providedIn: 'root'
})
export class LoanService {
  private apiUrl = '/api/Loans';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  createLoan(request: CreateLoanRequest): Observable<Loan> {
    return this.http.post<Loan>(this.apiUrl, request, {
      headers: this.getHeaders()
    });
  }

  getLoanById(loanId: number): Observable<Loan> {
    return this.http.get<Loan>(`${this.apiUrl}/${loanId}`, {
      headers: this.getHeaders()
    });
  }

  getLoansByBranch(branchId: number): Observable<Loan[]> {
    return this.http.get<{ $values?: Loan[] } | Loan[]>(`${this.apiUrl}/branch/${branchId}`, {
      headers: this.getHeaders()
    }).pipe(
      timeout(15000),
      map((response: { $values?: Loan[] } | Loan[]) => {
        const list = (response && typeof response === 'object' && '$values' in response && response.$values)
          ? response.$values
          : (Array.isArray(response) ? response : []);
        return list ?? [];
      }),
      catchError(() => of([]))
    );
  }

  getActiveLoanSummary(): Observable<ActiveLoanSummaryDto[]> {
    return this.http.get<{ $values?: ActiveLoanSummaryDto[] } | ActiveLoanSummaryDto[]>(`${this.apiUrl}/activeloansummary`, {
      headers: this.getHeaders()
    }).pipe(
      timeout(15000),
      map((response: { $values?: ActiveLoanSummaryDto[] } | ActiveLoanSummaryDto[]) => {
        const list = (response && typeof response === 'object' && '$values' in response && response.$values)
          ? response.$values
          : (Array.isArray(response) ? response : []);
        return list ?? [];
      }),
      catchError(() => of([]))
    );
  }
}
