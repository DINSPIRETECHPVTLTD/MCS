import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { forkJoin } from 'rxjs';
import { Router } from '@angular/router';
import { ViewWillEnter, ModalController, ToastController, LoadingController, AlertController } from '@ionic/angular';
import { ColDef, GridReadyEvent, GridOptions } from 'ag-grid-community';
import { AuthService } from '../../services/auth.service';
import { UserContextService } from '../../services/user-context.service';
import { MemberService } from '../../services/member.service';
import { Branch } from '../../models/branch.models';
import { CenterOption, Member, POCOption } from '../../models/member.models';
import { BranchService } from '../../services/branch.service';
import { AddMemberModalComponent } from './add-member-modal.component';
import { EditMemberModalComponent } from './edit-member-modal.component';

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
  selectedCenterId: number | null = null;
  private lastCenterId: number | null = null;
  isViewMembersClicked = false;
  showSearch = false;

  centers: CenterOption[] = [];
  pocs: POCOption[] = [];

  // AG Grid
  rowData: Array<Record<string, any>> = [];
  originalRowData: Array<Record<string, any>> = [];
  columnDefs: ColDef[] = [
    {field: 'memberId', headerName: 'Member ID/Code' },
    { field: 'memberFirstName', headerName: 'Member First Name' },
    { field: 'memberMiddleName', headerName: 'Member Middle Name' },
    { field: 'memberLastName', headerName: 'Member Last Name'},
    { field: 'memberDob', headerName: 'Member DOB'},
    { field: 'memberAge', headerName: 'Member Age'},
    { field: 'memberPhone', headerName: 'Member Phone '},
    { field: 'memberAddress', headerName: 'Member Address' },
    { field: 'memberAadhaar', headerName: 'Member Aadhaar'},
    { field: 'memberOccupation', headerName: 'Member Occupation'},
    { field: 'memberStatus', headerName: 'Member Status'},
    { field: 'guardianName', headerName: 'Husband/Guardian Name'},
    { field: 'guardianAge', headerName: 'Husband/Guardian Age'},
    { field: 'branch', headerName: 'Branch'},
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
        loanBtn.addEventListener('click', () => console.log('Loan action:', params.data));

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
  pagination = true;
  paginationPageSize = 10;


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
    // Fetch all branches for mapping
    this.branchService.getBranches().subscribe(branches => {
      this.branches = branches ?? [];
      this.branchMap = new Map(this.branches.map(b => [Number(b.id), b.name]));
    });

    this.gridOptions = {
      theme: 'legacy',
      context: { componentParent: this },
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
    this.initializeSelectionAndData();
  }

  ngAfterViewInit(): void {
  }

  


  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

  onBranchChange(branch: Branch): void {
    console.log('MembersPage: onBranchChange called with branch ->', branch);
    this.selectedBranch = branch;
    this.selectedCenterId = null;
    this.rowData = [];

    // Load centers for this branch so the centers dropdown is populated
    if (branch && (branch.id || branch.id === 0)) {
      const id = Number(branch.id);
      if (!Number.isNaN(id) && id > 0) {
        this.loadCentersForBranch(id);
      }
    } else {
      // Fallback: try reading selected branch id from localStorage
      const saved = localStorage.getItem('selected_branch_id');
      const savedId = saved ? Number(saved) : 0;
      if (savedId && !Number.isNaN(savedId)) {
        this.loadCentersForBranch(savedId);
      }
    }
  }

  onCenterChange(centerId: any): void {
    const id = Number(centerId);
    const normalizedId = id ? id : null;
    if (normalizedId === this.lastCenterId) {
      return;
    }

    this.lastCenterId = normalizedId;
    this.selectedCenterId = normalizedId;
    this.refreshMembers();
  }

  onFilterChange(event: any): void {
    const searchValue = (event.target.value || '').trim().toLowerCase();
    
    if (!this.originalRowData || this.originalRowData.length === 0) {
      console.log('No data to filter');
      return;
    }

    // Define searchable fields
    const searchFields = [
      'memberId',
      'memberFirstName',
      'memberMiddleName',
      'memberLastName',
      'memberPhone',
      'memberAadhaar',
      'memberAddress'
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

  async onViewMembers(): Promise<void> {
    this.isViewMembersClicked = true;
    this.showSearch = true;

    if (this.centers.length === 0) {
      this.isLoading = true;
      this.memberService.getAllCenters().subscribe({
        next: centers => {
          this.centers = centers ?? [];
          this.isLoading = false;
        },
        error: () => {
          this.centers = [];
          this.isLoading = false;
        }
      });
    }
  }

  private initializeSelectionAndData(): void {
    // No-op for Material table (columns are configured in displayedColumns)
  }


  private loadCentersForBranch(branchId: number): void {
    console.log('MembersPage: loadCentersForBranch branchId =', branchId);
    this.isLoading = true;
    this.memberService.getAllCenters().subscribe({
      next: centers => {
        this.centers = (centers ?? []).filter(c => Number(c.branchId) === Number(branchId));
        this.isLoading = false;

        // Auto-select if only one center
        if (this.centers.length === 1) {
          this.selectedCenterId = this.centers[0].id;
          this.refreshMembers();
        }
      },
      error: () => {
        this.isLoading = false;
        this.centers = [];
      }
    });
  }

  private async refreshMembers(): Promise<void> {
    if (this.isLoadingMembers) {
      return;
    }

    const centerId = Number(this.selectedCenterId ?? 0);
    if (!centerId) {
      this.rowData = [];
      return;
    }

    const branchId = this.selectedBranch?.id;
    console.log('MembersPage: refreshMembers branchId =', branchId, 'centerId =', centerId);
    if (!branchId) {
      this.rowData = [];
      return;
    }

    this.isLoadingMembers = true;

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

        this.centers = centers ?? [];
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

        const filtered = list.filter(m => {
          const mCenter = Number(m?.centerId ?? m?.CenterId ?? 0);
          if (!mCenter || Number.isNaN(mCenter)) return false;
          return mCenter === centerId;
        });
        const mappedData = filtered.map(m => this.toGridRow(m as any, centerMap, pocMap));
        this.rowData = mappedData;
        console.log('Loaded members:', this.rowData);
        this.originalRowData = [...mappedData];  // Store original data for filtering
      },
      error: async () => {
        await loading.dismiss();
        this.isLoadingMembers = false;
        this.rowData = [];
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
    pocMap: Map<number, string>
  ): Record<string, any> {
    const m: any = member as any;

    // Backend DTO uses PascalCase (e.g., FirstName, DOB). Keep camelCase fallbacks too.
    const guardianFirst = (m.guardianFirstName ?? m.GuardianFirstName ?? '').toString().trim();
    const guardianMiddle = (m.guardianMiddleName ?? m.GuardianMiddleName ?? '').toString().trim();
    const guardianLast = (m.guardianLastName ?? m.GuardianLastName ?? '').toString().trim();
    const guardianName = [guardianFirst, guardianMiddle, guardianLast]
      .filter(Boolean)
      .join(' ')
      .trim();
    const memberId = Number(m.id ?? m.Id ?? 0);
    const firstName = (m.firstName ?? m.FirstName ?? '').toString();
    const middleName = (m.middleName ?? m.MiddleName ?? '').toString();
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

    return {
      memberId,
      memberFirstName: firstName,
      memberMiddleName: middleName,
      memberLastName: lastName,
      memberDob: dob,
      memberAge: m.age ?? m.Age ?? '',
      memberPhone: phoneNumber,
      memberAddress: this.formatAddress(m),
      memberAadhaar: m.aadhaar ?? m.Aadhaar ?? '',
      memberOccupation: m.occupation ?? m.Occupation ?? '',
      memberStatus: m.isDeleted ? 'Inactive' : 'Active',
      guardianName,
      guardianAge: m.guardianAge ?? m.GuardianAge ?? '',
      branch: this.selectedBranch?.name,
      center: centerMap.get(centerId) ?? '',
      poc: pocDisplay
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
}

