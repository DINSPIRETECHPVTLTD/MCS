import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { forkJoin, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { User, CreateUserRequest } from '../models/user.models';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    console.log('user data in service:', user); // Debug log
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.post<User>(`${this.apiUrl}/Users`, user, { headers });
  }
  getUser(id: number): Observable<User> {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.get<User>(`${this.apiUrl}/Users/${id}`, { headers });
  }

  updateUser(id: number, user: Partial<CreateUserRequest>): Observable<User> {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.put<User>(`${this.apiUrl}/Users/${id}`, user, { headers });
  }

  deleteUser(id: number): Observable<unknown> {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.delete(`${this.apiUrl}/Users/${id}`, { headers });
  }

  resetUserPassword(id: number, newPassword: string): Observable<unknown> {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.post(`${this.apiUrl}/Users/${id}/reset-password`, { password: newPassword }, { headers });
  }

  getUsersByIds(ids: number[]): Observable<User[]> {
    if (!ids || ids.length === 0) {
      return new Observable(observer => {
        observer.next([]);
        observer.complete();
      });
    }

    // Call getUser for each ID and combine results
    const requests = ids.map(id => this.getUser(id));
    return forkJoin(requests);
  }
}

