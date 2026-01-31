export interface LoginRequest {
  username?: string;
  email?: string;
  password: string;
}

export interface BranchInfoDto {
  id?: number;
  name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  phoneNumber?: string;
  orgId?: number;
}

export interface OrganizationWithBranchDto {
  id?: number;
  name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  phoneNumber?: string;
  branches?: BranchInfoDto[];
}

export interface LoginResponse {
  token?: string;
  userType?: string;
  userId?: number;
  userName?: string;
  firstName?: string;
  lastName?: string;
  organization?: OrganizationWithBranchDto;
  role?: string;
  // Support both camelCase and PascalCase from API
  Token?: string;
  UserType?: string;
  UserId?: number;
  UserName?: string;
  FirstName?: string;
  LastName?: string;
  Organization?: OrganizationWithBranchDto;
  Role?: string;
  [key: string]: unknown;
}
