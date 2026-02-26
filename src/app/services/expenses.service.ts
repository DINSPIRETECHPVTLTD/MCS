import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { Expenses, CreateExpenseRequest } from '../models/expenses.models';


// eslint-disable-next-line @typescript-eslint/no-explicit-any
@Injectable({
  providedIn: 'root'
})
export class ExpensesService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getExpenses(): Observable<Expenses[]> {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.get<Expenses[]>(`${this.apiUrl}/Expenses`, { headers });
  }

  createExpense(expense: CreateExpenseRequest): Observable<Expenses> {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.post<Expenses>(`${this.apiUrl}/Expenses`, expense, { headers });
  }
 
}

