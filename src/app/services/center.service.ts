import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Center {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class CenterService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getCenters(): Observable<Center[]> {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.get<Center[]>(`${this.apiUrl}/Centers`, { headers });
  }

  // Alternative endpoint if API differs
  getCentersList(): Observable<Center[]> {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.get<Center[]>(`${this.apiUrl}/Center/List`, { headers });
  }
}
