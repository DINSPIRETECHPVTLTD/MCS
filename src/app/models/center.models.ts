export interface Center {
  id?: number;
  centerName: string;
  centerAddress: string;
  branchName: string;
  city: string;
}

export interface CreateCenterRequest {
  name: string;
  branchId: number;
  centerAddress?: string | null;
  city?: string | null;
}
