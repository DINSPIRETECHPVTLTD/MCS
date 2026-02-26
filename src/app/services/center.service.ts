
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { AuthService } from './auth.service';
import { Center, CreateCenterRequest } from '../models/center.models';

@Injectable({
  providedIn: 'root'
})
export class CenterService {
  private apiUrl = '/api/Centers';

  // ✅ BehaviorSubject holds current centers state
  private centersSubject = new BehaviorSubject<Center[]>([]);
  public centers$ = this.centersSubject.asObservable();

  // Track the current branchId so auto-reloads after create/update/delete use the same branch
  private currentBranchId: number | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) { }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // ✅ Load centers for a specific branch and broadcast via BehaviorSubject
  loadCenters(branchId: number): void {
    this.currentBranchId = branchId;
    this.http.get<Center[]>(`${this.apiUrl}/${branchId}`, { headers: this.getHeaders() }).subscribe({
      next: (centers) => this.centersSubject.next(centers),
      error: (err) => {
        console.error('Error loading centers:', err);
        this.centersSubject.next([]);
      }
    });
  }

  /**
   * Update a center by ID (PUT: api/Centers/{id})
   */
  updateCenter(id: number, payload: Partial<Center>): Observable<Center> {
    return this.http.put<Center>(`${this.apiUrl}/${id}`, payload, {
      headers: this.getHeaders()
    }).pipe(
      tap(() => {
        if (this.currentBranchId != null) this.loadCenters(this.currentBranchId);
      })
    );
  }

  createCenter(payload: CreateCenterRequest): Observable<Center> {
    return this.http.post<Center>(this.apiUrl, payload, {
      headers: this.getHeaders()
    }).pipe(
      tap(() => {
        if (this.currentBranchId != null) this.loadCenters(this.currentBranchId);
      })
    );
  }

  /**
   * Delete a center by ID (DELETE: api/Centers/{id})
   */
  deleteCenter(id: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    }).pipe(
      tap(() => {
        if (this.currentBranchId != null) this.loadCenters(this.currentBranchId);
      })
    );
  }
}
