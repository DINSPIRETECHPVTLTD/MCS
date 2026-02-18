import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { MemberService } from '../../services/member.service';
import { UserService } from '../../services/user.service';
import { UserContextService } from '../../services/user-context.service';
import { User } from '../../models/user.models';
import { ColDef, GridApi, GridOptions, GridReadyEvent, RowSelectionOptions } from 'ag-grid-community';
import { agGridTheme } from '../../ag-grid-theme';
import { ToastController, LoadingController } from '@ionic/angular';
import { Branch } from '../../models/branch.models';
import { POCOption } from '../../models/member.models';

/** One row per member: POC info + member info, selectable via checkbox */
export interface RecoveryPostingMemberRow {
  parentPocName: string;
  centerName: string;
  memberId: string;
  memberName: string;
  due: number;
}

@Component({
  selector: 'app-recovery-posting',
  templateUrl: './recovery-posting.page.html',
  styleUrls: ['./recovery-posting.page.scss']
})
export class RecoveryPostingComponent implements OnInit, ViewWillEnter {
  activeMenu: string = 'Recovery Posting';
  
  // Filters
  selectedBranch: Branch | null = null;
  selectedCenter: string = '';
  centers: { id: number; name: string; code?: string }[] = [];
  selectedPoc: string = '';
  pocs: POCOption[] = [];
  selectedCollectBy: string = '';
  users: User[] = [];

  // Date: ion-input type="date" (same as add loan popup)
  selectedDate: string = '';
  selectedDateDisplay: string = '';
  todayDate: string = '';
  
  // Grid data: one row per member (flattened from POC + members)
  rowData: RecoveryPostingMemberRow[] = [];
  columnDefs: ColDef[] = [];
  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true
  };
  pagination: boolean = true;
  paginationPageSize: number = 20;
  rowSelection: RowSelectionOptions = {
    mode: 'multiRow'
  };
  private gridApi?: GridApi;
  selectAllChecked: boolean = false;
  isLoading: boolean = false;

  gridOptions: GridOptions<RecoveryPostingMemberRow> = {
    theme: agGridTheme
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private memberService: MemberService,
    private userService: UserService,
    private userContext: UserContextService
  ) {
    const today = new Date();
    this.todayDate = today.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    this.selectedDate = `${y}-${m}-${d}`;
    this.selectedDateDisplay = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.initializeGrid();
    this.loadData();
  }

  ionViewWillEnter(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    const branchId = this.selectedBranch?.id ?? this.getStoredBranchId();
    if (branchId != null) {
      if (!this.selectedBranch) {
        this.selectedBranch = { id: branchId } as Branch;
      }
      this.loadCentersByBranch(Number(branchId));
    } else {
      this.centers = [];
    }
    this.loadUsers();
    this.loadData();
  }

  private loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (list) => {
        const all = (list || []).filter(u => u.id != null);
        const branchId = this.selectedBranch?.id;
        this.users = branchId != null
          ? all.filter(u => Number(u.branchId) === Number(branchId))
          : all;
        const currentUserId = this.userContext.userId;
        if (currentUserId != null) {
          const found = this.users.find(u => u.id === currentUserId);
          if (found) {
            this.selectedCollectBy = String(found.id);
          } else {
            this.selectedCollectBy = '';
          }
        }
        this.loadData();
      },
      error: () => {
        this.users = [];
        this.loadData();
      }
    });
  }

  getUserDisplayName(user: User): string {
    const parts = [user.firstName, user['middleName'], user.lastName].filter(Boolean);
    return parts.join(' ').trim() || 'User';
  }

  initializeGrid(): void {
    this.columnDefs = [
      {
        headerName: 'Select',
        width: 80,
        checkboxSelection: true,
        headerCheckboxSelection: true,
        sortable: false,
        filter: false,
        pinned: 'left'
      },
      { field: 'parentPocName', headerName: 'Parent POC Name', flex: 1, minWidth: 160, sortable: true, filter: true },
      { field: 'centerName', headerName: 'Center Name', minWidth: 140, sortable: true, filter: true },
      { field: 'memberId', headerName: 'Member ID', width: 130, sortable: true, filter: true },
      { field: 'memberName', headerName: 'Member Name', flex: 1, minWidth: 180, sortable: true, filter: true },
      {
        field: 'due',
        headerName: 'Due',
        width: 120,
        sortable: true,
        filter: true,
        valueFormatter: (params) => (params.value != null ? Number(params.value).toFixed(2) : '0.00')
      }
    ];
  }

  async loadData(): Promise<void> {
    this.isLoading = true;
    // TODO: Replace with API call using this.selectedDate, this.selectedCenter, this.selectedPoc, this.selectedCollectBy
    const parentData = [
      {
        parentPocName: 'POC East',
        centerName: 'Center A',
        children: [
          { memberId: 'MMM0053', memberName: 'Gotru Lakshmi', due: 1280.00 },
          { memberId: 'MMM0084', memberName: 'Boggavarapu Venkata Lakshmi', due: 1280.00 },
          { memberId: 'MMM0123', memberName: 'Konda Surya Kumari', due: 960.00 },
          { memberId: 'MMM0156', memberName: 'Pothula Padmavathi', due: 1120.00 }
        ]
      },
      {
        parentPocName: 'POC West',
        centerName: 'Center A',
        children: [
          { memberId: 'MMM0189', memberName: 'Sunkara Anitha', due: 800.00 },
          { memberId: 'MMM0201', memberName: 'Vemula Radha', due: 1120.00 },
          { memberId: 'MMM0225', memberName: 'Yerramsetti Satyavathi', due: 1440.00 }
        ]
      },
      {
        parentPocName: 'POC North',
        centerName: 'Center B',
        children: [
          { memberId: 'MMM0245', memberName: 'Nalluri Padma', due: 960.00 },
          { memberId: 'MMM0267', memberName: 'Gaddam Lakshmi', due: 800.00 },
          { memberId: 'MMM0289', memberName: 'Korrapati Venkata Lakshmi', due: 1280.00 }
        ]
      }
    ];
    let rows: RecoveryPostingMemberRow[] = parentData.flatMap((p) =>
      (p.children || []).map((m) => ({
        parentPocName: p.parentPocName,
        centerName: p.centerName,
        memberId: m.memberId,
        memberName: m.memberName,
        due: m.due
      }))
    );

    const centerName = this.selectedCenter
      ? this.centers.find((c) => String(c.id) === this.selectedCenter)?.name
      : null;
    const selectedPocOption = this.selectedPoc ? this.pocs.find((p: POCOption) => String(p.id) === this.selectedPoc) : null;
    const pocDisplayName = selectedPocOption ? this.getPocDisplayName(selectedPocOption) : null;

    if (centerName) {
      rows = rows.filter((r) => r.centerName === centerName);
    }
    if (pocDisplayName) {
      rows = rows.filter((r) => r.parentPocName === pocDisplayName);
    }

    this.rowData = rows;

    setTimeout(() => {
      this.isLoading = false;
      if (this.gridApi) {
        this.gridApi.setGridOption('rowData', this.rowData);
        setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);
      }
    }, 500);
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    if (this.rowData && this.rowData.length > 0) {
      this.gridApi.setGridOption('rowData', this.rowData);
    }
    setTimeout(() => {
      this.gridApi?.sizeColumnsToFit();
    }, 100);
  }

  onSelectionChanged(): void {
    const selectedRows = this.gridApi?.getSelectedRows();
    this.selectAllChecked = selectedRows ? selectedRows.length === this.rowData.length && this.rowData.length > 0 : false;
  }

  selectAll(): void {
    if (this.gridApi) {
      this.gridApi.selectAll();
      this.selectAllChecked = true;
    }
  }

  deselectAll(): void {
    if (this.gridApi) {
      this.gridApi.deselectAll();
      this.selectAllChecked = false;
    }
  }

  async postSelected(): Promise<void> {
    const selectedRows = this.gridApi?.getSelectedRows();
    if (!selectedRows || selectedRows.length === 0) {
      const toast = await this.toastController.create({
        message: 'Please select at least one row to post',
        duration: 2000,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Posting selected entries...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // TODO: Implement POST API call
      // await this.recoveryPostingService.postEntries(selectedRows);
      
      loading.dismiss();
      const toast = await this.toastController.create({
        message: `Successfully posted ${selectedRows.length} entry/entries`,
        duration: 2000,
        color: 'success',
        position: 'top'
      });
      await toast.present();
      
      // Reload data
      this.loadData();
    } catch (error) {
      loading.dismiss();
      const toast = await this.toastController.create({
        message: 'Error posting entries. Please try again.',
        duration: 3000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
    }
  }

  close(): void {
    // TODO: Implement close functionality
    this.router.navigate(['/home']);
  }

  onDateChange(): void {
    if (this.selectedDate) {
      const d = new Date(this.selectedDate);
      this.selectedDateDisplay = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    this.loadData();
  }

  onCenterChange(): void {
    this.selectedPoc = '';
    this.loadPocsForCenter();
  }

  onPocChange(): void {
    this.loadData();
  }

  onCollectByChange(): void {
    this.loadData();
  }

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

  onBranchChange(branch: Branch): void {
    this.selectedBranch = branch;
    this.selectedCenter = '';
    this.selectedCollectBy = '';
    this.loadCentersByBranch(branch.id);
    this.loadUsers();
  }

  private getStoredBranchId(): number | null {
    try {
      const id = localStorage.getItem('selected_branch_id');
      return id != null && id !== '' ? Number(id) : null;
    } catch {
      return null;
    }
  }

  private loadCentersByBranch(branchId: number): void {
    this.memberService.getCentersByBranch(branchId).subscribe({
      next: (list) => {
        this.centers = (list || []).map(c => ({
          id: c.id,
          name: c.name || '',
          code: (c as { code?: string }).code
        }));
        if (this.centers.length > 0 && this.centers[0].id != null) {
          this.selectedCenter = String(this.centers[0].id);
          this.loadPocsForCenter();
        } else {
          this.selectedCenter = '';
          this.pocs = [];
          this.selectedPoc = '';
          this.loadData();
        }
      },
      error: () => {
        this.centers = [];
        this.selectedCenter = '';
        this.pocs = [];
        this.selectedPoc = '';
        this.loadData();
      }
    });
  }

  private loadPocsForCenter(): void {
    const branchId = this.selectedBranch?.id;
    const centerId = this.selectedCenter ? Number(this.selectedCenter) : null;
    if (branchId == null || centerId == null) {
      this.pocs = [];
      this.selectedPoc = '';
      this.loadData();
      return;
    }
    this.memberService.getPOCsByBranchAndCenter(branchId, centerId).subscribe({
      next: (list) => {
        this.pocs = list || [];
        if (this.pocs.length > 0 && this.pocs[0].id != null) {
          this.selectedPoc = String(this.pocs[0].id);
        } else {
          this.selectedPoc = '';
        }
        this.loadData();
      },
      error: () => {
        this.pocs = [];
        this.selectedPoc = '';
        this.loadData();
      }
    });
  }

  getPocDisplayName(poc: POCOption): string {
    if (poc.name) return poc.name;
    const parts = [poc.firstName, poc.middleName, poc.lastName].filter(Boolean);
    return parts.join(' ').trim() || `POC ${poc.id}`;
  }
}
