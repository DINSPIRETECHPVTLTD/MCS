import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { Branch, CreateBranchRequest } from '../models/branch.models';

@Injectable({
  providedIn: 'root'
})
export class BranchService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getBranches(): Observable<Branch[]> {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    // Try common branch endpoints
    return this.http.get<Branch[]>(`${this.apiUrl}/Branches`, { headers });
  }

  // Get branches list from API
  getBranchesList(): Observable<Branch[]> {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.get<Branch[]>(`${this.apiUrl}/Branch/List`, { headers });
  }

  getBranchById(id: number): Observable<Branch> {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.get<Branch>(`${this.apiUrl}/Branches/${id}`, { headers }).pipe(
      catchError((err) => {
        if (err.status === 404) {
          return this.http.get<Branch>(`${this.apiUrl}/Branch/${id}`, { headers });
        }
        return throwError(() => err);
      })
    );
  }

  createBranch(branch: CreateBranchRequest): Observable<Branch> {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    // Try primary endpoint then fallback to an alternative if not found
    return this.http.post<Branch>(`${this.apiUrl}/Branches`, branch, { headers }).pipe(
      catchError((err) => {
        if (err.status === 404) {
          // Try alternative endpoint(s)
          return this.http.post<Branch>(`${this.apiUrl}/Branch/Create`, branch, { headers });
        }
        return throwError(() => err);
      })
    );
  }

  updateBranch(id: number, branch: CreateBranchRequest): Observable<Branch> {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.put<Branch>(`${this.apiUrl}/Branches/${id}`, branch, { headers }).pipe(
      catchError((err) => {
        if (err.status === 404) {
          return this.http.put<Branch>(`${this.apiUrl}/Branch/Update/${id}`, branch, { headers });
        }
        return throwError(() => err);
      })
    );
  }

  inactivateBranch(id: number): Observable<unknown> {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.delete(`${this.apiUrl}/Branches/${id}`, { headers });
  }
}

