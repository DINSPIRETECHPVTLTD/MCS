/**
 * Member Data Models
 * Interfaces for member-related operations
 */

export interface Member {
  id?: number;
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
  centerId: number;
  pocId: number;
}

export interface BranchOption {
  id: number;
  name: string;
  code: string;
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
