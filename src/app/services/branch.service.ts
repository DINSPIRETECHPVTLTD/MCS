import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { AuthService } from './auth.service';
import { Branch, CreateBranchRequest } from '../models/branch.models';

@Injectable({
  providedIn: 'root'
})
export class BranchService {

  private apiUrl = '/api/branches';
  
  // ✅ BehaviorSubject holds current branches state
  private branchesSubject = new BehaviorSubject<Branch[]>([]);
  public branches$ = this.branchesSubject.asObservable();

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // ✅ Load and broadcast branches
  loadBranches(): void {
    this.http.get<Branch[]>(this.apiUrl, { headers: this.getHeaders() }).subscribe({
      next: (branches) => this.branchesSubject.next(branches),
      error: (err) => {
        console.error('Error loading branches:', err);
        this.branchesSubject.next([]);
      }
    });
  }

  createBranch(branch: CreateBranchRequest): Observable<CreateBranchRequest> {
    return this.http.post<CreateBranchRequest>(this.apiUrl, branch, { headers: this.getHeaders() }).pipe(
      tap(() => this.loadBranches()) // ✅ Auto-reload after create
    );
  }

  updateBranch(id: number, branch: CreateBranchRequest): Observable<CreateBranchRequest> {
    return this.http.put<CreateBranchRequest>(`${this.apiUrl}/${id}`, branch, { headers: this.getHeaders() }).pipe(
      tap(() => this.loadBranches()) // ✅ Auto-reload after update
    );
  }

  inactivateBranch(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}/inactive`, { headers: this.getHeaders() }).pipe(
      tap(() => this.loadBranches()) // ✅ Auto-reload after inactivate
    );
  }

   getBranchById(id: number): Observable<Branch> {
      return this.http.get<Branch>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
    }
}

