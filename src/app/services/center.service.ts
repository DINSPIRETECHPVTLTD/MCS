import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CenterService {
  private apiUrl = '/api/centers'; // Update with your actual API endpoint

  constructor(private http: HttpClient) {}

  addCenter(centerData: any): Observable<any> {
    return this.http.post(this.apiUrl, centerData);
  }
}
