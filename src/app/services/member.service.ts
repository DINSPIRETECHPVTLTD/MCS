import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Member {
  id: number;
  memberId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  age: number;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  dateOfBirth?: string;
  gender?: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class MemberService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  searchMembers(searchTerm: string): Observable<Member[]> {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    // TODO: Replace with actual API endpoint when available
    // For now, return empty array - API endpoint should search by firstName, lastName, middleName, and memberId
    // return this.http.get<Member[]>(`${this.apiUrl}/Members/Search?searchTerm=${encodeURIComponent(searchTerm)}`, { headers });
    
    // Placeholder: Return empty array for now
    return of([]);
  }

  getMemberById(memberId: string): Observable<Member> {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    // TODO: Replace with actual API endpoint when available
    // return this.http.get<Member>(`${this.apiUrl}/Members/${memberId}`, { headers });
    
    // Placeholder: Return null for now
    return of({} as Member);
  }
}
