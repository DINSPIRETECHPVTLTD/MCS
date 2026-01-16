import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { UserContextService } from './user-context.service';

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

  constructor(
    private http: HttpClient,
    private userContext: UserContextService
  ) {}

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
        console.log('Raw login response:', response);
        
        // Handle both PascalCase (from C# API) and camelCase properties
        const token = response.token || (response as any).Token || '';
        const userId = response.userId ?? (response as any).UserId ?? null;
        const organizationId = response.organizationId ?? (response as any).OrganizationId ?? null;
        const branchId = response.branchId ?? (response as any).BranchId ?? null;
        const role = response.role || (response as any).Role || '';
        const userType = response.userType || (response as any).UserType || '';
        
        console.log('Extracted values:', {
          token: token ? 'present' : 'missing',
          userId,
          organizationId,
          branchId,
          role,
          userType
        });
        
        // Store token
        if (token) {
          localStorage.setItem('auth_token', token);
          console.log('Auth token stored successfully');
        }
        
        // Build user info object from AuthResponseDto (flat structure)
        const userInfo: any = {
          // Map from PascalCase to camelCase for consistency
          userType: userType,
          role: role,
          userId: userId || 0,
          organizationId: organizationId,
          branchId: branchId
        };
        
        console.log('User info from login:', userInfo);
        
        // Store user info (for backward compatibility)
        localStorage.setItem('user_info', JSON.stringify(userInfo));
        
        // Initialize UserContext service with user information
        this.userContext.initialize(
          userId,
          organizationId,
          branchId,
          role,
          userType,
          credentials.email
        );
        
        console.log('UserContext initialized:', this.userContext.getAll());
      })
    );
  }

  logout(): void {
    // Clear user context
    this.userContext.clear();
    
    // Clear all authentication data
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    localStorage.removeItem('organization_info');
  }

  getOrganizationId(): number | null {
    return this.userContext.organizationId;
  }

  getBranchId(): number | null {
    return this.userContext.branchId;
  }
  getRole(): string {
    return this.userContext.role;
  }
  getLevel(): string {
    return this.userContext.level;
  }
  getEmail(): string {
    return this.userContext.email;
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

