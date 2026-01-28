import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { Branch, CreateBranchRequest } from '../models/branch.models';

@Injectable({
  providedIn: 'root'
})
export class BranchService {
  private apiUrl = environment.apiUrl;
  private selectedBranchSubject = new BehaviorSubject<Branch | null>(null);
  public selectedBranch$ = this.selectedBranchSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  setSelectedBranch(branch: Branch | null): void {
    this.selectedBranchSubject.next(branch);
  }

  getSelectedBranch(): Branch | null {
    return this.selectedBranchSubject.value;
  }

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

  deleteBranch(id: number): Observable<any> {
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

