import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { LedgerBalances } from '../models/ledger-balance.modal';
import { CreateFundTransferRequest } from '../models/fund-transfer.models';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
@Injectable({
  providedIn: 'root'
})
export class LedgerBalanceService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getLedgerBalances(): Observable<LedgerBalances[]> {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.get<LedgerBalances[]>(`${this.apiUrl}/ledgerbalances`, { headers });
  }

  createFundTransfer(fundTransfer: CreateFundTransferRequest): Observable<LedgerBalances> {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.post<LedgerBalances>(`${this.apiUrl}/ledgerbalances/fund-transfer`, fundTransfer, { headers });
  }
 
}