import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { UserContextService } from './user-context.service';
import { LoginRequest, LoginResponse, OrganizationWithBranchDto, BranchInfoDto } from '../models/auth.models';
import { Branch } from '../models/branch.models';

/* eslint-disable @typescript-eslint/no-explicit-any */
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

    return this.http.post<LoginResponse>(
      `${this.apiUrl}/Auth/login`,
      payload,
      { headers }
    ).pipe(
      tap(response => {
        // Handle both PascalCase (from C# API) and camelCase properties
        const token = response.token || response.Token || '';
        const userId = response.userId ?? response.UserId ?? null;
        const userType = response.userType || response.UserType || '';
        const userName = response.userName || response.UserName || '';
        const firstName = response.firstName || response.FirstName || '';
        const lastName = response.lastName || response.LastName || '';
        const role = response.role || response.Role || '';
        
        // Extract organization data
        const organization = response.organization || response.Organization;
        const orgAny = organization as any; // Handle both PascalCase and camelCase
        const organizationId = organization?.id ?? orgAny?.Id ?? null;
        const organizationName = organization?.name || orgAny?.Name || '';
        
        // Extract branch data - use first branch only for branch-level users (owner starts in Org Mode with no branch)
        const branches = organization?.branches || orgAny?.Branches || [];
        const roleLower = (role || '').toLowerCase();
        const userTypeLower = (userType || '').toLowerCase();
        const isOrgOwner = userTypeLower === 'organization' && roleLower === 'owner';
        const branchId = isOrgOwner
          ? null
          : (branches.length > 0 ? (branches[0]?.id ?? (branches[0] as any)?.Id ?? null) : null);
        
        // Store token
        if (token) {
          localStorage.setItem('auth_token', token);
        }
        
        // Build user info object from AuthResponseDto
        const userInfo: any = {
          userType: userType,
          role: role,
          userId: userId || 0,
          userName: userName,
          firstName: firstName,
          lastName: lastName,
          organizationId: organizationId,
          branchId: branchId,
          email: credentials.email || userName
        };
        
        // Store user info (for backward compatibility)
        localStorage.setItem('user_info', JSON.stringify(userInfo));
        
        // Store organization info
        if (organization) {
          const orgAny = organization as any; // Handle both PascalCase and camelCase
          localStorage.setItem('organization_info', JSON.stringify({
            id: organizationId,
            name: organizationName,
            address1: organization.address1 || orgAny.Address1,
            address2: organization.address2 || orgAny.Address2,
            city: organization.city || orgAny.City,
            state: organization.state || orgAny.State,
            country: organization.country || orgAny.Country,
            zipCode: organization.zipCode || orgAny.ZipCode,
            phoneNumber: organization.phoneNumber || orgAny.PhoneNumber,
            branches: branches
          }));
        }
        
        // Owner starts in Org Mode: clear any previous branch selection from localStorage
        if (isOrgOwner) {
          try {
            localStorage.removeItem('selected_branch_id');
          } catch (_) {}
        }
        
        // Initialize UserContext service with user information
        this.userContext.initialize(
          userId,
          organizationId,
          branchId,
          role,
          userType,
          credentials.email || userName,
          firstName,
          lastName,
          userName
        );
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

  getOrganizationInfo(): OrganizationWithBranchDto | null {
    const orgInfo = localStorage.getItem('organization_info');
    return orgInfo ? JSON.parse(orgInfo) : null;
  }

  /**
   * Get branches from login response (stored in organization_info)
   * Maps BranchInfoDto to Branch format
   * Returns empty array if not available
   */
  getBranchesFromLogin(): Branch[] {
    const orgInfo = this.getOrganizationInfo();
    const branchInfoDtos = orgInfo?.branches || [];
    
    // Map BranchInfoDto to Branch format
    return branchInfoDtos.map((branchDto: BranchInfoDto) => ({
      id: branchDto.id || 0,
      name: branchDto.name || '',
      code: undefined, // BranchInfoDto doesn't have code
      address: branchDto.address1 || branchDto.address2 || undefined,
      city: branchDto.city,
      state: branchDto.state,
      country: branchDto.country,
      zipCode: branchDto.zipCode,
      phoneNumber: branchDto.phoneNumber,
      // Include all original properties for backward compatibility
      ...branchDto
    } as Branch));
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }
}

