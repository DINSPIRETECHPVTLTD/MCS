import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { AuthService } from './auth.service';
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
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  private unwrapList(response: any): any[] {
    const raw =
      response?.$values ??
      response?.data?.$values ??
      response?.data ??
      response?.items?.$values ??
      response?.items ??
      response;

    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.$values)) return raw.$values;
    return [];
  }

  getAllCenters(): Observable<Center[]> {
    return this.http
      .get<any>(this.centersUrl, { headers: this.getHeaders() })
      .pipe(
        map((response: any) => {
          const list = this.unwrapList(response);
          return list
            .filter(Boolean)
            .map((c: any) => {
              const centerName = (c?.centerName ?? c?.CenterName ?? c?.name ?? c?.Name ?? '').toString().trim();
              const centerAddress = (c?.centerAddress ?? c?.CenterAddress ?? c?.address ?? c?.Address ?? '').toString();
              const branchName = (c?.branchName ?? c?.BranchName ?? c?.branch ?? c?.Branch ?? c?.branch?.name ?? c?.Branch?.Name ?? '').toString().trim();
              const city = (c?.city ?? c?.City ?? '').toString().trim();

              return {
                id: Number(c?.id ?? c?.Id ?? 0) || undefined,
                centerName,
                centerAddress,
                branchName,
                city
              } satisfies Center;
            })
            .filter((c: Center) => !!c.centerName);
        })
      );
  }

  getBranchNamesFromCenters(): Observable<string[]> {
    return this.http
      .get<any>(this.centersUrl, { headers: this.getHeaders() })
      .pipe(
        map((response: any) => {
          const list = this.unwrapList(response);
          const names = list
            .map((c: any) =>
              (c?.branchName ?? c?.BranchName ?? c?.branch ?? c?.Branch ?? c?.branch?.name ?? c?.Branch?.Name ?? '')
                .toString()
                .trim()
            )
            .filter(Boolean);

          return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
        })
      );
  }

  /**
   * Fetch branch names from GET: api/Branches
   */
  getBranchNames(): Observable<string[]> {
    return this.http.get<any>(this.branchesUrl, { headers: this.getHeaders() }).pipe(
      map((response: any) => {
        const list = this.unwrapList(response);
        const names = list
          .map((b: any) => (b?.name ?? b?.Name ?? b?.branchName ?? b?.BranchName ?? '').toString().trim())
          .filter(Boolean);

        return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
      })
    );
  }

  /**
   * Fetch branches with IDs from GET: /Branches
   */
  getBranches(): Observable<BranchLookup[]> {
    return this.http.get<any>(this.branchesUrl, { headers: this.getHeaders() }).pipe(
      map((response: any) => {
        const list = this.unwrapList(response);

        return list
          .filter(Boolean)
          .map((b: any) => ({
            id: Number(b?.id ?? b?.Id ?? 0),
            name: (b?.name ?? b?.Name ?? b?.branchName ?? b?.BranchName ?? '').toString().trim()
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
}
