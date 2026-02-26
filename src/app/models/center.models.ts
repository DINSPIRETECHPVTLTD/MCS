export interface Center {
  id?: number;
  name: string;
  centerAddress: string;
  branchName: string;
  branchId?: number;
  city: string;
}

export interface CreateCenterRequest {
  name: string;
  branchId: number;
  centerAddress?: string | null;
  city?: string | null;
}
