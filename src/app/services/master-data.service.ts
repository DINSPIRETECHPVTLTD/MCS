import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from './auth.service';
import { MasterLookup, CreateMasterLookupRequest } from '../models/master-data.models';

@Injectable({
  providedIn: 'root'
})
export class MasterDataService {
  private apiUrl = '/api/MasterLookups';

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

  getMasterData(includeInactive = false): Observable<MasterLookup[]> {
    return this.http.get<{ $values?: MasterLookup[] } | MasterLookup[]>(this.apiUrl, {
      headers: this.getHeaders()
    }).pipe(
      map((response: { $values?: MasterLookup[] } | MasterLookup[]) => {
        const list = (response && typeof response === 'object' && '$values' in response && response.$values)
          ? response.$values
          : (Array.isArray(response) ? response : []);
        const items = list ?? [];
        return includeInactive ? items : items.filter((item: MasterLookup) => item.isActive !== false);
      }),
      catchError(() => of([]))
    );
  }

  getMasterDataById(id: number): Observable<MasterLookup | null> {
    return this.http.get<MasterLookup>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(() => of(null))
    );
  }

  createMasterData(request: CreateMasterLookupRequest): Observable<MasterLookup> {
    return this.http.post<MasterLookup>(this.apiUrl, request, {
      headers: this.getHeaders()
    });
  }

  updateMasterData(id: number, request: Partial<CreateMasterLookupRequest>): Observable<MasterLookup> {
    return this.http.put<MasterLookup>(`${this.apiUrl}/${id}`, request, {
      headers: this.getHeaders()
    });
  }

  /** Soft delete: set isActive = false */
  softDeleteMasterData(id: number): Observable<MasterLookup> {
    return this.http.patch<MasterLookup>(`${this.apiUrl}/${id}`, { isActive: false }, {
      headers: this.getHeaders()
    });
  }
}
