
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { AuthService } from './auth.service';
import { ApiResponseService } from './api-response.service';
import { Center, CreateCenterRequest } from '../models/center.models';

export interface BranchLookup {
  id: number;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class CenterService {
  private readonly centersUrl = '/Centers';
  private readonly branchesUrl = '/Branches';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private apiResponse: ApiResponseService
  ) {}

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  }

  private text(value: unknown): string {
    return value == null ? '' : String(value);
  }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Update a center by ID (PUT: api/Centers/{id})
   */
  updateCenter(id: number, payload: Partial<Center>): Observable<Center> {
    return this.http.put<Center>(`${this.centersUrl}/${id}`, payload, {
      headers: this.getHeaders()
    });
  }

  getAllCenters(): Observable<Center[]> {
    return this.http
      .get<unknown>(this.centersUrl, { headers: this.getHeaders() })
      .pipe(
        map((response: unknown) => {
          const list = this.apiResponse.unwrapList<Record<string, unknown>>(response);
          return list
            .filter(Boolean)
            .map((c: Record<string, unknown>) => {
              const branch = this.asRecord(c['branch'] ?? c['Branch']);

              const centerName = this.text(c['centerName'] ?? c['CenterName'] ?? c['name'] ?? c['Name']).trim();
              const centerAddress = this.text(c['centerAddress'] ?? c['CenterAddress'] ?? c['address'] ?? c['Address']);
              const branchId = Number(c['branchId'] ?? c['BranchId'] ?? 0) || undefined;
              const branchName = this.text(
                c['branchName'] ??
                  c['BranchName'] ??
                  c['branch'] ??
                  c['Branch'] ??
                  branch?.['name'] ??
                  branch?.['Name']
              ).trim();
              const city = this.text(c['city'] ?? c['City']).trim();

              return {
                id: Number(c['id'] ?? c['Id'] ?? 0) || undefined,
                centerName,
                centerAddress,
                branchName,
                branchId,
                city
              } satisfies Center;
            })
            .filter((c: Center) => !!c.centerName);
        })
      );
  }

  getBranchNamesFromCenters(): Observable<string[]> {
    return this.http
      .get<unknown>(this.centersUrl, { headers: this.getHeaders() })
      .pipe(
        map((response: unknown) => {
          const list = this.apiResponse.unwrapList<Record<string, unknown>>(response);
          const names = list
            .map((c: Record<string, unknown>) => {
              const branch = this.asRecord(c['branch'] ?? c['Branch']);
              return this.text(
                c['branchName'] ??
                  c['BranchName'] ??
                  c['branch'] ??
                  c['Branch'] ??
                  branch?.['name'] ??
                  branch?.['Name']
              ).trim();
            })
            .filter(Boolean);

          return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
        })
      );
  }

  /**
   * Fetch branch names from GET: api/Branches
   */
  getBranchNames(): Observable<string[]> {
    return this.http.get<unknown>(this.branchesUrl, { headers: this.getHeaders() }).pipe(
      map((response: unknown) => {
        const list = this.apiResponse.unwrapList<Record<string, unknown>>(response);
        const names = list
          .map((b: Record<string, unknown>) =>
            this.text(b['name'] ?? b['Name'] ?? b['branchName'] ?? b['BranchName']).trim()
          )
          .filter(Boolean);

        return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
      })
    );
  }

  /**
   * Fetch branches with IDs from GET: /Branches
   */
  getBranches(): Observable<BranchLookup[]> {
    return this.http.get<unknown>(this.branchesUrl, { headers: this.getHeaders() }).pipe(
      map((response: unknown) => {
        const list = this.apiResponse.unwrapList<Record<string, unknown>>(response);

        return list
          .filter(Boolean)
          .map((b: Record<string, unknown>) => ({
            id: Number(b['id'] ?? b['Id'] ?? 0),
            name: this.text(b['name'] ?? b['Name'] ?? b['branchName'] ?? b['BranchName']).trim()
          }))
          .filter((b: BranchLookup) => b.id > 0 && !!b.name)
          .sort((a, b) => a.name.localeCompare(b.name));
      })
    );
  }

  createCenter(payload: CreateCenterRequest): Observable<Center> {
    return this.http.post<Center>(this.centersUrl, payload, {
      headers: this.getHeaders()
    });
  }

  /**
   * Delete a center by ID (DELETE: api/Centers/{id})
   */
  deleteCenter(id: number): Observable<unknown> {
    return this.http.delete(`${this.centersUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }
}
