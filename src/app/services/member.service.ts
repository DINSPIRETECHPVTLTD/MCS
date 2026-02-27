import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import {
  Member,
  CreateMemberRequest,
  AadhaarValidationResponse
} from '../models/member.models';

export type { Member } from '../models/member.models';

/* eslint-disable @typescript-eslint/no-explicit-any */
@Injectable({
  providedIn: 'root'
})
export class MemberService {
  private apiUrl = '/api/Members';

  // ✅ BehaviorSubject holds current members state
  private membersSubject = new BehaviorSubject<Member[]>([]);
  public members$ = this.membersSubject.asObservable();

  // Track current branchId for auto-reloads after create/update/inactivate
  private currentBranchId: number | null = null;

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

  // ✅ Load members for a branch and broadcast via BehaviorSubject
  loadMembers(branchId: number): void {
    this.currentBranchId = branchId;
    this.http.get<Member[]>(`${this.apiUrl}/branch/${branchId}`, { headers: this.getHeaders() }).subscribe({
      next: (members) => this.membersSubject.next(members),
      error: (err) => {
        console.error('Error loading members:', err);
        this.membersSubject.next([]);
      }
    });
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
   * Create new member — auto-reloads members$ after success
   */
  createMember(memberData: CreateMemberRequest): Observable<Member> {
    return this.http.post<Member>(this.apiUrl, memberData, {
      headers: this.getHeaders()
    }).pipe(
      tap(() => {
        if (this.currentBranchId != null) this.loadMembers(this.currentBranchId); // ✅ Auto-reload after create
      })
    );
  }

  /**
   * Update existing member — auto-reloads members$ after success
   */
  updateMember(memberId: number, memberData: CreateMemberRequest): Observable<Member> {
    return this.http.put<Member>(`${this.apiUrl}/${memberId}`, memberData, {
      headers: this.getHeaders()
    }).pipe(
      tap(() => {
        if (this.currentBranchId != null) this.loadMembers(this.currentBranchId); // ✅ Auto-reload after update
      })
    );
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
   * Delete member
   */
  deleteMember(memberId: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/${memberId}`, {
      headers: this.getHeaders()
    });
  }
}