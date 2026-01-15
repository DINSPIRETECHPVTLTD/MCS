import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
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

  // Alternative endpoint if the above doesn't work
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

    return this.http.post<Branch>(`${this.apiUrl}/Branches`, branch, { headers });
  }
}

