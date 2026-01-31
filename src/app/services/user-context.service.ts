import { Injectable } from '@angular/core';

/**
 * UserContextService - Centralized service to hold user information
 * Populated during login and accessible throughout the application
 */
@Injectable({
  providedIn: 'root'
})
export class UserContextService {
  // User identification
  private _userId: number | null = null;
  
  // Organization and Branch
  private _organizationId: number | null = null;
  private _branchId: number | null = null;
  
  // User role and level
  private _role: string = '';
  private _level: string = ''; // Also known as userType
  
  // Additional user info
  private _email: string = '';
  private _userName: string = '';
  private _firstName: string = '';
  private _lastName: string = '';

  constructor() {
    // Load from localStorage on service initialization
    this.loadFromStorage();
  }

  /**
   * Initialize user context from login response
   */
  initialize(
    userId: number | null,
    organizationId: number | null,
    branchId: number | null,
    role: string,
    level: string,
    email?: string,
    firstName?: string,
    lastName?: string,
    userName?: string
  ): void {
    // Only set values if they are not null/undefined/0 (for IDs, 0 might be valid)
    // But for organizationId, if it's 0, we should treat it as null
    this._userId = userId && userId !== 0 ? userId : null;
    this._organizationId = organizationId && organizationId !== 0 ? organizationId : null;
    this._branchId = branchId && branchId !== 0 ? branchId : null;
    this._role = role || '';
    this._level = level || '';
    this._email = email || '';
    this._firstName = firstName || '';
    this._lastName = lastName || '';
    this._userName = userName || '';
    
    // Persist to localStorage
    this.saveToStorage();
  }

  /**
   * Clear user context (on logout)
   */
  clear(): void {
    this._userId = null;
    this._organizationId = null;
    this._branchId = null;
    this._role = '';
    this._level = '';
    this._email = '';
    this._firstName = '';
    this._lastName = '';
    this._userName = '';
    
    // Clear from localStorage
    localStorage.removeItem('user_context');
  }

  /**
   * Load user context from localStorage
   */
  private loadFromStorage(): void {
    const stored = localStorage.getItem('user_context');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        // Handle 0 values - treat 0 as null for IDs
        this._userId = data.userId && data.userId !== 0 ? data.userId : null;
        this._organizationId = data.organizationId && data.organizationId !== 0 ? data.organizationId : null;
        this._branchId = data.branchId && data.branchId !== 0 ? data.branchId : null;
        this._role = data.role || '';
        this._level = data.level || '';
        this._email = data.email || '';
        this._firstName = data.firstName || '';
        this._lastName = data.lastName || '';
        this._userName = data.userName || '';
      } catch (error) {
        console.error('Error loading user context from storage:', error);
        // Clear corrupted data
        localStorage.removeItem('user_context');
      }
    }
  }

  /**
   * Save user context to localStorage
   */
  private saveToStorage(): void {
    const data = {
      userId: this._userId,
      organizationId: this._organizationId,
      branchId: this._branchId,
      role: this._role,
      level: this._level,
      email: this._email,
      firstName: this._firstName,
      lastName: this._lastName,
      userName: this._userName
    };
    try {
      localStorage.setItem('user_context', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving user context to storage:', error);
    }
  }

  // Getters
  get userId(): number | null {
    return this._userId;
  }

  get organizationId(): number | null {
    return this._organizationId;
  }

  get branchId(): number | null {
    return this._branchId;
  }

  get role(): string {
    return this._role;
  }

  get level(): string {
    return this._level;
  }

  get email(): string {
    return this._email;
  }

  get userName(): string {
    return this._userName;
  }

  get firstName(): string {
    return this._firstName;
  }

  get lastName(): string {
    return this._lastName;
  }

  /**
   * Check if user is organization level owner
   */
  isOrgOwner(): boolean {
    const levelLower = this._level?.toLowerCase() || '';
    const roleLower = this._role?.toLowerCase() || '';
    return (levelLower === 'organization') && roleLower === 'owner';
  }

  /**
   * Check if user is branch level user
   */
  isBranchUser(): boolean {
    const levelLower = this._level?.toLowerCase() || '';
    const roleLower = this._role?.toLowerCase() || '';
    return (levelLower === 'branch') &&
           (roleLower === 'staff' ||
            roleLower === 'branchadmin' );
  }

  /**
   * Get all user context as an object
   */
  getAll(): {
    userId: number | null;
    organizationId: number | null;
    branchId: number | null;
    role: string;
    level: string;
    email: string;
    firstName: string;
    lastName: string;
    userName: string;
  } {
    return {
      userId: this._userId,
      organizationId: this._organizationId,
      branchId: this._branchId,
      role: this._role,
      level: this._level,
      email: this._email,
      firstName: this._firstName,
      lastName: this._lastName,
      userName: this._userName
    };
  }

  /**
   * Debug method to check UserContext state
   */
  debug(): void {
    // Debug information removed
  }
}

