import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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
}

