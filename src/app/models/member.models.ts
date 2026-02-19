/**
 * Member Data Models
 * Interfaces for member-related operations
 */

export interface Member {
  id?: number;
  /**
   * Optional aliases for compatibility with templates/services that use alternate naming.
   * These are safe to add because they are optional and type-only.
   */
  memberId?: number;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  phoneNumber: string;
  phone?: string;
  altPhone?: string | null;
  address1?: string | null;
  address2?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  aadhaar?: string | null;
  dob?: string | null;
  dateOfBirth?: string | null;
  age: number;
  email?: string | null;
  gender?: string | null;
  guardianFirstName: string;
  guardianMiddleName?: string | null;
  guardianLastName: string;
  guardianPhone: string;
  guardianDOB?: string | null;
  guardianAge: number;
  guardianRelationship?: string | null;
  centerId: number;
  pocId: number;
  createdAt?: string;
}

export interface CreateMemberRequest {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  phoneNumber: string;
  altPhone?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  aadhaar?: string | null;
  dob?: string | null;
  age: number;
  guardianFirstName: string;
  guardianMiddleName?: string | null;
  guardianLastName: string;
  guardianPhone: string;
  guardianDOB?: string | null;
  guardianAge: number;
  guardianRelationship?: string | null;
  centerId: number;
  pocId: number;
  paymentMode?: string | null;
  paymentAmount?: number | null;
  paymentDate?: string | null;
  collectedBy?: number | null; // User ID
}

export interface BranchOption {
  id: number;
  name: string;
}

export interface CenterOption {
  id: number;
  name: string;
  branchId: number;
}

export interface POCOption {
  id: number;
  branchId: number;
  centerId: number;
  contactNumber: string;
  phoneNumber: string; // Added for API compatibility
  email?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  name?: string; // Added for template compatibility
}

export interface MemberStatus {
  value: string;
  label: string;
}

export interface AadhaarValidationResponse {
  isUnique: boolean;
  message: string;
}
