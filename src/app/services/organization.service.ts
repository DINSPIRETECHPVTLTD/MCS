import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Organization {
  id?: number;
  name: string;
  phone?: string;
  city?: string;
  email?: string;
  address?: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class OrganizationService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getOrganizationDetails(): Observable<Organization> {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    // Try common organization endpoints
    return this.http.get<Organization>(`${this.apiUrl}/Organization`, { headers });
  }

  // Alternative endpoint if the above doesn't work
  getOrganizationInfo(): Observable<Organization> {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.get<Organization>(`${this.apiUrl}/Organization/Info`, { headers });
  }
}

