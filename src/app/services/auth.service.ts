import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface LoginRequest {
  username?: string;
  email?: string;
  password: string;
}

export interface LoginResponse {
  token?: string;
  userType?: string;
  userId?: number;
  organizationId?: number;
  branchId?: number;
  role?: string;
  user?: {
    email?: string;
    username?: string;
    [key: string]: any;
  };
  organization?: {
    name?: string;
    phone?: string;
    city?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    // Ensure email is included in the request payload
    const payload: any = {
      password: credentials.password
    };

    // Include email if provided
    if (credentials.email) {
      payload.email = credentials.email;
    }

    // Include username if provided (for backward compatibility)
    if (credentials.username) {
      payload.username = credentials.username;
    }

    console.log('Login request payload:', payload);

    return this.http.post<LoginResponse>(
      `${this.apiUrl}/Auth/login`,
      payload,
      { headers }
    ).pipe(
      tap(response => {
        // Store token from AuthResponseDto
        if (response.token) {
          localStorage.setItem('auth_token', response.token);
        }
        
        // Build user info object from AuthResponseDto (flat structure)
        const userInfo: any = {
          // Map from PascalCase to camelCase for consistency
          userType: response.userType || '',
          role: response.role || '',
          userId: response.userId || 0,
          organizationId: response.organizationId || null,
          branchId: response.branchId || null
        };
        
        console.log('User info from login:', userInfo);
        
        // Store user info
        localStorage.setItem('user_info', JSON.stringify(userInfo));
      })
    );
  }

  logout(): void {
    // Clear all authentication data
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    localStorage.removeItem('organization_info');
  }

  getUserInfo(): any {
    const userInfo = localStorage.getItem('user_info');
    return userInfo ? JSON.parse(userInfo) : null;
  }

  getOrganizationInfo(): { name?: string; phone?: string; city?: string; [key: string]: any } | null {
    const orgInfo = localStorage.getItem('organization_info');
    return orgInfo ? JSON.parse(orgInfo) : null;
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }
}

