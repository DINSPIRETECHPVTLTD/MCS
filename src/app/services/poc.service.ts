import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
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
  zipCode?: string;
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
  zipCode?: string;
  centerId: number;
  collectionDay?: string;
  collectionFrequency: string;
  collectionBy: number;
}

@Injectable({
  providedIn: 'root'
})
export class PocService {
  private apiUrl = '/api/POCs';

  // ✅ BehaviorSubject — all pages share this single in-memory list
  private pocsSubject = new BehaviorSubject<Poc[]>([]);
  public pocs$ = this.pocsSubject.asObservable();

  // Track current context so reloads after mutations use the same scope
  private currentBranchId: number | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // ✅ Load all POCs for a branch and broadcast to all subscribers
  loadPocsByBranch(branchId: number): void {
    this.currentBranchId = branchId;
    this.http.get<Poc[]>(`${this.apiUrl}/Branch/${branchId}`, { headers: this.getHeaders() }).subscribe({
      next: (pocs) => this.pocsSubject.next(pocs),
      error: (err) => {
        console.error('Error loading POCs:', err);
        this.pocsSubject.next([]);
      }
    });
  }


  getPocById(id: number): Observable<Poc> {
    return this.http.get<Poc>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  createPoc(poc: CreatePocRequest): Observable<Poc> {
    return this.http.post<Poc>(this.apiUrl, poc, { headers: this.getHeaders() }).pipe(
      tap(() => {
        if (this.currentBranchId != null) this.loadPocsByBranch(this.currentBranchId);
      })
    );
  }

  updatePoc(id: number, poc: CreatePocRequest): Observable<Poc> {
    return this.http.put<Poc>(`${this.apiUrl}/${id}`, poc, { headers: this.getHeaders() }).pipe(
      tap(() => {
        if (this.currentBranchId != null) this.loadPocsByBranch(this.currentBranchId);
      })
    );
  }

  deletePoc(id: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() }).pipe(
      tap(() => {
        if (this.currentBranchId != null) this.loadPocsByBranch(this.currentBranchId);
      })
    );
  }
}
