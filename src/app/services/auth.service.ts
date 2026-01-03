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
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
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
        // Store token if present
        if (response.token) {
          localStorage.setItem('auth_token', response.token);
        } else if (response.accessToken) {
          localStorage.setItem('auth_token', response.accessToken);
        }
        // Store user info if present
        if (response.user) {
          localStorage.setItem('user_info', JSON.stringify(response.user));
        }
        // Store organization info if present in login response
        if (response.organization) {
          localStorage.setItem('organization_info', JSON.stringify(response.organization));
        }
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

