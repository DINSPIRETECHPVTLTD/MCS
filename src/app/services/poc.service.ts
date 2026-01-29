import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Poc {
  id?: number;
  firstName: string;
  middleName?: string;
  lastName: string;
  phoneNumber: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  centerId: number;
  branchId?: number;
}

export interface CreatePocRequest {
  firstName: string;
  middleName?: string;
  lastName: string;
  phoneNumber: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  centerId: number;
  
}

@Injectable({
  providedIn: 'root'
})
export class PocService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getPocs(): Observable<Poc[]> {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.get<Poc[]>(`${this.apiUrl}/POCs`, { headers });
  }

  getPocsByBranch(branchId: number): Observable<Poc[]> {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.get<Poc[]>(`${this.apiUrl}/POCs/Branch/${branchId}`, { headers });
  }

  createPoc(poc: CreatePocRequest): Observable<Poc> {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.post<Poc>(`${this.apiUrl}/POCs`, poc, { headers });
  }

  updatePoc(id: number, poc: CreatePocRequest): Observable<Poc> {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.put<Poc>(`${this.apiUrl}/POCs/${id}`, poc, { headers });
  }

  deletePoc(id: number): Observable<any> {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.delete(`${this.apiUrl}/POCs/${id}`, { headers });
  }
}
