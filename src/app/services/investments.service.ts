import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { Investments, CreateInvestmentRequest } from '../models/investments.models';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
@Injectable({
  providedIn: 'root'
})
export class InvestmentsService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getInvestments(): Observable<Investments[]> {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.get<Investments[]>(`${this.apiUrl}/Investments`, { headers });
  }

  createInvestment(investment: CreateInvestmentRequest): Observable<Investments> {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.post<Investments>(`${this.apiUrl}/Investments`, investment, { headers });
  }
 
}