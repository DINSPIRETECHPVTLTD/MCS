import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, BehaviorSubject, catchError, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import {
  Member,
  CreateMemberRequest,
  BranchOption,
  CenterOption,
  POCOption,
  AadhaarValidationResponse
} from '../models/member.models';

export type { Member } from '../models/member.models';

@Injectable({
  providedIn: 'root'
})
export class MemberService {
  private apiUrl = '/api/Members';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  private normalizePOC(raw: any): POCOption {
    const firstName = raw?.firstName ?? raw?.FirstName ?? '';
    const middleName = raw?.middleName ?? raw?.MiddleName ?? '';
    const lastName = raw?.lastName ?? raw?.LastName ?? '';

    const nameFromParts = [firstName, middleName, lastName].filter(Boolean).join(' ').trim();
    const name = (
      raw?.name ??
      raw?.Name ??
      raw?.poc ??
      raw?.POC ??
      raw?.fullName ??
      raw?.FullName ??
      nameFromParts ??
      ''
    ).toString().trim();

    const contact =
      raw?.phoneNumber ??
      raw?.PhoneNumber ??
      raw?.contactNumber ??
      raw?.ContactNumber ??
      raw?.mobileNumber ??
      raw?.MobileNumber ??
      raw?.phone ??
      raw?.Phone ??
      '';

    return {
      id: Number(raw?.id ?? raw?.pocId ?? raw?.POCId ?? 0),
      branchId: Number(raw?.branchId ?? raw?.BranchId ?? 0),
      centerId: Number(raw?.centerId ?? raw?.CenterId ?? raw?.centerID ?? raw?.CenterID ?? 0),
      contactNumber: (raw?.contactNumber ?? raw?.ContactNumber ?? contact ?? '').toString(),
      phoneNumber: (raw?.phoneNumber ?? raw?.PhoneNumber ?? contact ?? '').toString(),
      email: raw?.email ?? raw?.Email,
      firstName: firstName?.toString() ?? '',
      middleName: middleName?.toString() ?? '',
      lastName: lastName?.toString() ?? '',
      name
    };
  }

  /**
   * Get all branches for dropdown
   */
  getBranchOptions(): Observable<BranchOption[]> {
    return this.http.get<any>('/Branches', {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        const branches = response.$values ?? response;
        return branches.map((branch: any) => ({
          id: branch.id,
          name: branch.name,
          code: branch.code || ''
        }));
      })
    );
  }

  /**
   * Get all centers from database
   */
  getAllCenters(): Observable<CenterOption[]> {
  return this.http.get<any>('/Centers', {
    headers: this.getHeaders()
  }).pipe(
    map(response => {
      console.log('Centers API RAW Response:', response);

      const centersRaw =
        response?.$values ??
        response?.data?.$values ??
        response?.data ??
        response?.data?.centers ??
        response?.centers ??
        response?.items?.$values ??
        response?.items ??
        response;

      const centers = Array.isArray(centersRaw)
        ? centersRaw
        : Array.isArray(centersRaw?.$values)
          ? centersRaw.$values
          : [];

      return centers
        .filter((center: any) => {
          if (!center) return false;
          const isDeleted = center?.isDeleted ?? center?.IsDeleted ?? false;
          const id = Number(center?.id ?? center?.Id ?? 0);
          const name = (center?.name ?? center?.Name ?? center?.centerName ?? center?.CenterName ?? '').toString().trim();
          return !isDeleted && id > 0 && !!name;
        })
        .map((center: any) => ({
          id: Number(center?.id ?? center?.Id ?? 0),
          name: (center?.name ?? center?.Name ?? center?.centerName ?? center?.CenterName ?? '').toString().trim(),
          branchId: Number(center?.branchId ?? center?.BranchId ?? 0)
        }));
    })
  );
}


  /**
   * Get centers by branch - filters from all centers
   */
  getCentersByBranch(branchId: number): Observable<CenterOption[]> {
    console.log('Fetching centers for branchId:', branchId);
    return this.http.get<any[]>('/Centers', {
      headers: this.getHeaders()
    }).pipe(
      map(data => {
        console.log('Centers by Branch API Response:', data);
        // Map API response to CenterOption interface
        return data
          .filter(center => center.branchId === branchId)
          .map(center => ({
            id: center.id,
            name: center.name || center.centerName || '',
            branchId: center.branchId || 0
          }));
      })
    );
  }

  /**
   * Get POCs by branch and center
   */
  getPOCsByBranchAndCenter(branchId: number, centerId: number): Observable<POCOption[]> {
    return this.http.get<any>(
      `${environment.apiUrl}/pocs/branch/${branchId}/center/${centerId}`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => {
        const items = response?.$values ?? response;
        const list = Array.isArray(items) ? items : [];
        return list.map(poc => this.normalizePOC(poc));
      })
    );
}

  /**
   * Get POC details by ID
   */
  getPOCById(pocId: number): Observable<POCOption> {
    return this.http.get<any>(`/api/pocs/${pocId}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => this.normalizePOC(response))
    );
  }

  /**
   * Validate Aadhaar uniqueness
   */
  validateAadhaarUniqueness(aadhaar: string): Observable<AadhaarValidationResponse> {
    return this.http.get<AadhaarValidationResponse>(
      `/api/members/validate-aadhaar/${aadhaar}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Create new member
   */
  createMember(memberData: CreateMemberRequest): Observable<Member> {
    return this.http.post<Member>(this.apiUrl, memberData, {
      headers: this.getHeaders()
    });
  }

  /**
   * Update existing member
   */
  updateMember(memberId: number, memberData: CreateMemberRequest): Observable<Member> {
    return this.http.put<Member>(`${this.apiUrl}/${memberId}`, memberData, {
      headers: this.getHeaders()
    });
  }

  /**
   * Get member by ID
   */
  getMemberById(memberId: number): Observable<Member> {
    return this.http.get<Member>(`${this.apiUrl}/${memberId}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Get all members by branch
   */
  getMembersByBranch(branchId: number): Observable<Member[]> {
    return this.http.get<Member[]>(`${this.apiUrl}/branch/${branchId}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Get all members
   */
  getAllMembers(): Observable<Member[]> {
    return this.http.get<Member[]>(this.apiUrl, {
      headers: this.getHeaders()
    });
  }

  /**
   * Search members by a free-text term.
   * Attempts a backend search endpoint first, then falls back to client-side filtering.
   */
  searchMembers(term: string): Observable<Member[]> {
    const query = (term ?? '').trim();
    if (!query) return of([]);

    const q = query.toLowerCase();

    // Best-effort server-side search (endpoint/param names can vary by backend)
    return this.http.get<Member[]>(`${this.apiUrl}/search`, {
      headers: this.getHeaders(),
      params: { term: query }
    }).pipe(
      catchError(() =>
        this.getAllMembers().pipe(
          map((members) =>
            (members ?? []).filter((m) => {
              const id = String((m as any)?.id ?? '');
              const phone = String((m as any)?.phoneNumber ?? '');
              const firstName = String((m as any)?.firstName ?? '').toLowerCase();
              const middleName = String((m as any)?.middleName ?? '').toLowerCase();
              const lastName = String((m as any)?.lastName ?? '').toLowerCase();
              const fullName = `${firstName} ${middleName} ${lastName}`.replace(/\s+/g, ' ').trim();

              return (
                id.includes(query) ||
                phone.includes(query) ||
                firstName.includes(q) ||
                middleName.includes(q) ||
                lastName.includes(q) ||
                fullName.includes(q)
              );
            })
          )
        )
      )
    );
  }

  /**
   * Get members using query params (some backends prefer this over /branch routes)
   * Example: GET /api/Members?branchId=1&centerId=2
   */
  getMembersFiltered(filter: { branchId?: number; centerId?: number }): Observable<Member[]> {
    const params: Record<string, string> = {};
    if (filter.branchId) params['branchId'] = String(filter.branchId);
    if (filter.centerId) params['centerId'] = String(filter.centerId);

    return this.http.get<Member[]>(this.apiUrl, {
      headers: this.getHeaders(),
      params
    });
  }

  /**
   * Delete member
   */
  deleteMember(memberId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${memberId}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Get all POCs from API
   */
  getAllPOCs(): Observable<POCOption[]> {
    return this.http.get<any>(
      `${environment.apiUrl}/POCs`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => {
        const items = response?.$values ?? response;
        const list = Array.isArray(items) ? items : [];
        return list.map(poc => this.normalizePOC(poc));
      })
    );
  }
}
