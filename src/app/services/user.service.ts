import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface User {
  id?: number;
  firstName: string;
  middleName?: string;
  lastName: string;
  phoneNumber?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  email?: string;
  level?: string;
  role?: string;
  organizationId?: number;
  branchId?: number | null;
  [key: string]: any;
}

export interface CreateUserRequest {
  firstName: string;
  middleName?: string;
  lastName: string;
  phoneNumber?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  email?: string;
  level: string;
  role: string;
  organizationId: number;
  branchId?: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getUsers(): Observable<User[]> {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.get<User[]>(`${this.apiUrl}/Users`, { headers });
  }

  createUser(user: CreateUserRequest): Observable<User> {
    const token = this.authService.getToken();
    console.log('Creating user with data:', user);
    console.log('Using token:', token);
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    console.log('user', JSON.stringify(user));
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    console.log(this.apiUrl + '/Users');
    return this.http.post<User>(`${this.apiUrl}/Users`, user, { headers });
  }
}

