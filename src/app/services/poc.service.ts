import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Poc {
  id?: number;
  firstName: string;
  lastName?: string;
  phoneNumber: string;
  altPhone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  centerId: number;
  branchId?: number;
  collectionDay?: string;
  collectionFrequency: string;
  collectionBy: number;
}

export interface CreatePocRequest {
  firstName: string;
  lastName?: string;
  phoneNumber: string;
  altPhone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  centerId: number;
  collectionDay?: string;
  collectionFrequency: string;
  collectionBy: number;
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

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    if (token) {
      return headers.set('Authorization', `Bearer ${token}`);
    }
    
    return headers;
  }

  getPocs(): Observable<Poc[]> {
    return this.http.get<Poc[]>(`${this.apiUrl}/POCs`, { headers: this.getHeaders() });
  }

  getPocsByBranch(branchId: number): Observable<Poc[]> {
    return this.http.get<Poc[]>(`${this.apiUrl}/POCs/Branch/${branchId}`, { headers: this.getHeaders() });
  }

  createPoc(poc: CreatePocRequest): Observable<Poc> {
    return this.http.post<Poc>(`${this.apiUrl}/POCs`, poc, { headers: this.getHeaders() });
  }

  updatePoc(id: number, poc: CreatePocRequest): Observable<Poc> {
    return this.http.put<Poc>(`${this.apiUrl}/POCs/${id}`, poc, { headers: this.getHeaders() });
  }

  deletePoc(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/POCs/${id}`, { headers: this.getHeaders() });
  }
}
