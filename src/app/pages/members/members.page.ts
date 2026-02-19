import { Component, OnInit, AfterViewInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { Router } from '@angular/router';
import { ViewWillEnter, ModalController, ToastController, LoadingController, AlertController } from '@ionic/angular';
import { ColDef, GridReadyEvent, GridOptions } from 'ag-grid-community';
import { agGridTheme } from '../../ag-grid-theme';
import { AuthService } from '../../services/auth.service';
import { UserContextService } from '../../services/user-context.service';
import { MemberService } from '../../services/member.service';
import { Branch } from '../../models/branch.models';
import { CenterOption, Member, POCOption } from '../../models/member.models';
import { BranchService } from '../../services/branch.service';
import { AddMemberModalComponent } from './add-member-modal.component';
import { EditMemberModalComponent } from './edit-member-modal.component';
import { AddLoanModalComponent } from '../add-loan/add-loan-modal.component';

@Component({
  selector: 'app-members',
  templateUrl: './members.page.html',
  styleUrls: ['./members.page.scss']
})
export class MembersComponent implements OnInit, ViewWillEnter, AfterViewInit {
  activeMenu: string = 'Members';
  isLoading: boolean = false;
  isLoadingMembers: boolean = false;

  selectedBranch: Branch | null = null;
  showSearch = true;

  centers: CenterOption[] = [];
  pocs: POCOption[] = [];

  // AG Grid
  rowData: Array<Record<string, any>> = [];
  originalRowData: Array<Record<string, any>> = [];
  columnDefs: ColDef[] = [
    { field: 'memberId', headerName: 'ID/Code' },
    { field: 'memberFirstName', headerName: 'First Name' },
    { field: 'memberLastName', headerName: 'Last Name' },
    { field: 'dobAge', headerName: 'DOB/Age' },
    { field: 'memberPhone', headerName: 'Phone' },
    { field: 'center', headerName: 'Center'},
    { field: 'poc', headerName: 'POC'},
    {
      headerName: 'Actions',
      width: 300,
      filter: false,
      sortable: false,
      cellRenderer: (params: any) => {
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.gap = '8px';

        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.className = 'ag-btn ag-edit';
        editBtn.addEventListener('click', () => this.openEditMemberModal(params.data));

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'ag-btn ag-delete';
        deleteBtn.addEventListener('click', () => this.deleteRow(params.data));

        const loanBtn = document.createElement('button');
        loanBtn.textContent = 'Add/View Loan';
        loanBtn.className = 'ag-btn ag-loan';
        
        loanBtn.addEventListener('click', async () => {
          if (params.data.loanId && params.data.loanId > 0) {
            this.openViewLoan(params.data);
          } else {
              await this.openAddLoanModal(params.data);
          }
        });

        container.appendChild(editBtn);
        container.appendChild(deleteBtn);
        container.appendChild(loanBtn);

        return container;
      }
    }
  ];
  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true
  };
  paginationPageSize: number = 10;


  branches: Branch[] = [];
  branchMap: Map<number, string> = new Map();
  gridApi: any = null;

  constructor(
    private authService: AuthService,
    private userContext: UserContextService,
    private memberService: MemberService,
    private branchService: BranchService,
    private router: Router,
    private modalController: ModalController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) {
    this.gridOptions = {
      theme: agGridTheme,
      context: { componentParent: this },
      pagination: true,
      paginationPageSize: this.paginationPageSize,
      onGridReady: (event: GridReadyEvent) => {
        this.gridApi = event.api;
      }
    };
  }

  gridOptions: GridOptions;

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    console.log('Selected Branch:', this.selectedBranch);
  }

  ionViewWillEnter(): void {
    // Reload data when page becomes active
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    // Load branches from auth service if not already loaded
    if (this.branches.length === 0) {
      const branchesFromLogin = this.authService.getBranchesFromLogin();
      if (branchesFromLogin && branchesFromLogin.length > 0) {
        this.branches = branchesFromLogin;
        this.branchMap = new Map(this.branches.map(b => [Number(b.id), b.name]));
      }
    }

    const branchId = this.resolveSelectedBranchId();
    if (branchId) {
      // Ensure selectedBranch has at least an id (name can be resolved from branchMap).
      if (!this.selectedBranch) {
        const match = (this.branches ?? []).find(b => Number(b.id) === Number(branchId)) ?? null;
        this.selectedBranch = match ?? ({ id: branchId } as any);
      }
      void this.refreshMembers();
    } else {
      // No branch selected yet.
      this.rowData = [];
      this.originalRowData = [];
    }
  }

  ngAfterViewInit(): void {
  }

  


  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

  onBranchChange(branch: Branch): void {
    console.log('MembersPage: onBranchChange called with branch ->', branch);
    this.selectedBranch = branch;
    this.rowData = [];
    this.originalRowData = [];
    void this.refreshMembers();
  }

  onFilterChange(event: any): void {
    const rawValue = (event?.target?.value ?? event?.detail?.value ?? '').toString();
    const searchValue = rawValue.trim().toLowerCase();
    
    if (!this.originalRowData || this.originalRowData.length === 0) {
      console.log('No data to filter');
      return;
    }

    // Define searchable fields
    const searchFields = [
      'memberId',
      'memberFirstName',
      'memberLastName',
      'dobAge',
      'memberPhone',
      'center',
      'poc'
    ];

    if (searchValue === '') {
      // If search is empty, show all data
      this.rowData = [...this.originalRowData];
    } else {
      // Filter from original data and update rowData
      this.rowData = this.originalRowData.filter(row =>
        searchFields.some(field =>
          String(row[field] || '').toLowerCase().includes(searchValue)
        )
      );
    }
    
    // Update grid with filtered data
    if (this.gridApi) {
      this.gridApi.setRowData(this.rowData);
    }
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    console.log('Grid API initialized');
  }


  private resolveSelectedBranchId(): number | null {
    const fromContext = this.userContext.branchId;
    if (fromContext != null) {
      const ctx = Number(fromContext);
      return Number.isFinite(ctx) && ctx > 0 ? ctx : null;
    }

    const raw = localStorage.getItem('selected_branch_id');
    const fromStorage = raw ? Number(raw) : null;
    return fromStorage && Number.isFinite(fromStorage) && fromStorage > 0 ? fromStorage : null;
  }

  private async refreshMembers(): Promise<void> {
    if (this.isLoadingMembers) {
      return;
    }

    const branchId = Number(this.selectedBranch?.id ?? this.resolveSelectedBranchId() ?? 0);
    console.log('MembersPage: refreshMembers branchId =', branchId);
    if (!branchId || Number.isNaN(branchId)) {
      this.rowData = [];
      this.originalRowData = [];
      return;
    }

    this.isLoadingMembers = true;
    this.isLoading = true;

    const loading = await this.loadingController.create({ message: 'Loading members...' });
    await loading.present();

    forkJoin({
      centers: this.memberService.getAllCenters(),
      pocs: this.memberService.getAllPOCs(),
      members: this.memberService.getMembersByBranch(branchId)
    }).subscribe({
      next: ({ centers, pocs, members }) => {
        loading.dismiss();
        this.isLoadingMembers = false;
        this.isLoading = false;

        // Keep only this branch's centers for mapping CenterId -> CenterName.
        this.centers = (centers ?? []).filter(c => Number((c as any).branchId) === Number(branchId));
        this.pocs = pocs ?? [];

        const centerMap = new Map<number, string>(this.centers.map(c => [Number(c.id), c.name]));
        const pocMap = new Map<number, string>(
          (this.pocs ?? []).map(p => {
            const rawName = (p as any).name ?? (p as any).poc ?? (p as any).POC ?? '';
            const name = this.normalizeDisplayName(rawName);
            return [Number((p as any).id), name];
          })
        );

        const raw = (members as any)?.$values ?? members;
        const list: any[] = Array.isArray(raw) ? raw : [];

        const mappedData = list.map(m => this.toGridRow(m as any, centerMap, pocMap, branchId));

        // Defensive: prevent duplicate rows when backend returns duplicates.
        const seenIds = new Set<number>();
        const uniqueData = mappedData.filter(r => {
          const id = Number((r as any)?.memberId ?? 0);
          if (!id || Number.isNaN(id)) return true;
          if (seenIds.has(id)) return false;
          seenIds.add(id);
          return true;
        });

        this.rowData = uniqueData;
        console.log('Loaded members:', this.rowData);
        this.originalRowData = [...uniqueData];  // Store original data for filtering
      },
      error: async () => {
        await loading.dismiss();
        this.isLoadingMembers = false;
        this.isLoading = false;
        this.rowData = [];
        this.originalRowData = [];
        const toast = await this.toastController.create({
          message: 'Failed to load members.',
          duration: 2000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      }
    });
  }

  private toGridRow(
    member: Member,
    centerMap: Map<number, string>,
    pocMap: Map<number, string>,
    branchId?: number
  ): Record<string, any> {
    const m: any = member as any;

    // Backend DTO uses PascalCase (e.g., FirstName, DOB). Keep camelCase fallbacks too.
    const memberId = Number(m.id ?? m.Id ?? 0);
    const firstName = (m.firstName ?? m.FirstName ?? '').toString();
    const lastName = (m.lastName ?? m.LastName ?? '').toString();
    const dob = (m.dob ?? m.Dob ?? m.DOB ?? m.dateOfBirth ?? m.DateOfBirth ?? '').toString();
    const phoneNumber = (m.phoneNumber ?? m.PhoneNumber ?? '').toString();
    const centerId = Number(m.centerId ?? m.CenterId ?? m.CenterID ?? 0);
    

    const pocId = Number(m.pocId ?? m.POCId ?? 0);
    const pocDisplay = this.normalizeDisplayName(
      this.resolvePocNameFromMember(m) ||
      pocMap.get(pocId) ||
      (pocId ? pocId : '')
    );

    const dobDisplay = this.formatDate(dob);
    const ageValue = (m.age ?? m.Age ?? '').toString();
    const dobAge = dobDisplay && ageValue ? `${dobDisplay} / ${ageValue}` : (dobDisplay || ageValue || '');

    return {
      memberId,
      memberFirstName: firstName,
      memberLastName: lastName,
      dobAge,
      memberPhone: phoneNumber,
      branch: this.selectedBranch?.name ?? (branchId ? this.branchMap.get(Number(branchId)) : ''),
      center: centerMap.get(centerId) ?? '',
      poc: pocDisplay,
      loanId: m.loanId ?? null
    };
  }

  onCellClicked(event: any) {
    // Event handling is now done in cellRenderer with direct addEventListener
    // This method is kept for potential future use
  }

  private async deleteRow(row: any): Promise<void> {
    console.log('Delete clicked:', row);
    const alert = await this.alertController.create({
      header: 'Delete Member',
      message: `Are you sure you want to delete ${row.memberFirstName} ${row.memberLastName}?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
            console.log('Delete cancelled');
          }
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            console.log('Delete confirmed for:', row);
            await this.confirmDeleteMember(row);
          }
        }
      ]
    });
    await alert.present();
  }

  private async confirmDeleteMember(row: any): Promise<void> {
    const loading = await this.loadingController.create({
      message: 'Deleting member...'
    });
    await loading.present();

    this.memberService.deleteMember(row.memberId).subscribe({
      next: async () => {
        await loading.dismiss();
        const toast = await this.toastController.create({
          message: 'Member deleted successfully.',
          duration: 2000,
          color: 'success',
          position: 'top'
        });
        await toast.present();
        this.refreshMembers();
      },
      error: async (error) => {
        await loading.dismiss();
        console.error('Error deleting member:', error);
        const toast = await this.toastController.create({
          message: 'Failed to delete member.',
          duration: 2000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      }
    });
  }

  private formatAddress(m: any): string {
    const parts = [
      m.address1 ?? m.Address1,
      m.address2 ?? m.Address2,
      m.city ?? m.City,
      m.state ?? m.State,
      m.zipCode ?? m.ZipCode
    ].filter(Boolean);
    return parts.join(', ');
  }

  private formatDate(value: any): string {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value.toString();
    return d.toLocaleDateString();
  }

  private normalizeDisplayName(value: any): string {
    if (value == null) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') return value.toString();
    if (Array.isArray(value)) {
      const first = value.find(v => v != null);
      return this.normalizeDisplayName(first);
    }
    if (typeof value === 'object') {
      const rawName = value.name ?? value.Name ?? value.fullName ?? value.FullName ?? '';
      if (typeof rawName === 'string') {
        const name = rawName.trim();
        if (name) return name;
      } else if (rawName && typeof rawName === 'object') {
        const nested = this.normalizeDisplayName(rawName);
        if (nested) return nested;
      }

      const first = (value.firstName ?? value.FirstName ?? '').toString().trim();
      const middle = (value.middleName ?? value.MiddleName ?? '').toString().trim();
      const last = (value.lastName ?? value.LastName ?? '').toString().trim();
      const full = [first, middle, last].filter(Boolean).join(' ').trim();
      return full || '';
    }
    return String(value).trim();
  }

  private resolvePocNameFromMember(member: any): string {
    const fromDirect = this.normalizeDisplayName(member?.poc ?? member?.POC ?? member?.pocName ?? member?.PocName ?? '');
    if (fromDirect) return fromDirect;

    const pocId = Number(member?.pocId ?? member?.POCId ?? 0);
    const centerPocs = member?.center?.poCs ?? member?.center?.POCs ?? member?.Center?.poCs ?? [];
    if (pocId && Array.isArray(centerPocs)) {
      const match = centerPocs.find((p: any) => Number(p?.id ?? p?.Id ?? 0) === pocId);
      const fromCenter = this.normalizeDisplayName(match ?? '');
      if (fromCenter) return fromCenter;
    }

    return '';
  }

  // ============= ADD MEMBER MODAL METHODS =============

  async openAddMemberModal(): Promise<void> {
    const modal = await this.modalController.create({
      component: AddMemberModalComponent,
      cssClass: 'add-member-modal',
      breakpoints: [0, 0.5, 1],
      initialBreakpoint: 1
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data && data.success) {
      // Show success message
      this.showToast('Member added successfully!', 'success');
      // TODO: Reload members list when API is ready
    }
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  async openEditMemberModal(row: MembersComponent): Promise<void> {
    const modal = await this.modalController.create({
      component: EditMemberModalComponent,
      cssClass: 'edit-member-modal',
      breakpoints: [0, 0.5, 1],
      initialBreakpoint: 1,
      componentProps: {
        memberData: row
      }
    });

    await modal.present();

  }
  openViewLoan(member: any): void {
    if (!member || !member.loanId) return;
    this.router.navigate(['/view-loan', member.loanId]);
  }
  
  async openAddLoanModal(member: any): Promise<void> {
    const modal = await this.modalController.create({
      component: AddLoanModalComponent,
      cssClass: 'add-loan-modal',
      breakpoints: [0, 0.5, 1],
      initialBreakpoint: 1,
      componentProps: {
        selectedMember: member
      }
    });
    
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.loan) {
      this.showToast('Loan added successfully!', 'success');
      await this.refreshMembers(); // refresh members so button changes to "View Loan"
    }
  }


}

