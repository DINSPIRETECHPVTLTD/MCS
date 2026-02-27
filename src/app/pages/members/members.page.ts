import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ViewWillEnter, ModalController, ToastController, LoadingController, AlertController } from '@ionic/angular';
import { ColDef, GridReadyEvent, GridOptions } from 'ag-grid-community';
import { agGridTheme } from '../../ag-grid-theme';
import { AuthService } from '../../services/auth.service';
import { MemberService } from '../../services/member.service';
import { CenterService } from '../../services/center.service';
import { PocService, Poc } from '../../services/poc.service';
import { Branch } from '../../models/branch.models';
import { Member } from '../../models/member.models';
import { Center } from '../../models/center.models';
import { AddMemberModalComponent } from './add-member-modal.component';
import { EditMemberModalComponent } from './edit-member-modal.component';
import { AddLoanModalComponent } from '../add-loan/add-loan-modal.component';

@Component({
  selector: 'app-members',
  templateUrl: './members.page.html',
  styleUrls: ['./members.page.scss']
})
export class MembersComponent implements OnInit, OnDestroy, ViewWillEnter, AfterViewInit {
  activeMenu: string = 'Members';
  isLoading: boolean = false;

  selectedBranch: Branch | null = null;
  showSearch = true;

  centers: Center[] = [];
  pocs: Poc[] = [];

  // AG Grid
  rowData: any[] = [];
  originalRowData: any[] = [];

  columnDefs: ColDef[] = [
    { field: 'memberId', headerName: 'ID', width: 60, minWidth: 80 },
    {
      headerName: 'Full Name',
      flex: 2,
      minWidth: 280,
      cellRenderer: (params: any) => {
        const m = params.data;
        const memberName = `${(m.memberFirstName || '').trim()} ${(m.memberLastName || '').trim()}`.trim();
        const guardianName = `${(m.guardianFirstName || '').trim()} ${(m.guardianLastName || '').trim()}`.trim();
        const container = document.createElement('div');
        container.style.lineHeight = '1.5';
        const nameDiv = document.createElement('div');
        nameDiv.textContent = memberName;
        nameDiv.style.fontWeight = '500';
        container.appendChild(nameDiv);
        if (guardianName) {
          const guardDiv = document.createElement('div');
          guardDiv.textContent = guardianName;
          guardDiv.style.fontSize = '12px';
          guardDiv.style.color = '#666';
          container.appendChild(guardDiv);
        }
        return container;
      }
    },
    {
      headerName: 'Phone',
      flex: 1.8,
      minWidth: 200,
      cellRenderer: (params: any) => {
        const m = params.data;
        const memberPhone = (m.memberPhone || '').trim();
        const guardianPhone = (m.guardianPhone || '').trim();
        const container = document.createElement('div');
        container.style.lineHeight = '1.5';
        const phoneDiv = document.createElement('div');
        phoneDiv.textContent = memberPhone;
        phoneDiv.style.fontWeight = '500';
        container.appendChild(phoneDiv);
        if (guardianPhone) {
          const guardPhoneDiv = document.createElement('div');
          guardPhoneDiv.textContent = guardianPhone;
          guardPhoneDiv.style.fontSize = '12px';
          guardPhoneDiv.style.color = '#666';
          container.appendChild(guardPhoneDiv);
        }
        return container;
      }
    },
    { field: 'dobAge', headerName: 'DOB/Age' },
    { field: 'center', headerName: 'Center' },
    {
      headerName: 'Address',
      flex: 2.5,
      minWidth: 320,
      cellRenderer: (params: any) => {
        const m = params.data;
        const parts = [m.addressLine1, m.addressLine2, m.city, m.state, m.pincode]
          .filter(x => x && x.toString().trim() !== '');
        return `<div class="address-cell">${parts.join(', ')}</div>`;
      }
    },
    { field: 'poc', headerName: 'POC' },
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
        deleteBtn.textContent = 'Inactive';
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

  defaultColDef: ColDef = { sortable: true, filter: true, resizable: true };
  paginationPageSize: number = 10;
  selectedBranchId: number | null = null;
  gridApi: any = null;
  gridOptions: GridOptions;

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private memberService: MemberService,
    private centerService: CenterService,
    private pocService: PocService,
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

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.selectedBranchId = this.authService.getBranchId();

    // ✅ Subscribe to centers$ from CenterService
    this.centerService.centers$
      .pipe(takeUntil(this.destroy$))
      .subscribe(centers => {
        this.centers = centers ?? [];
        this.rebuildGrid();
      });

    // ✅ Subscribe to pocs$ from PocService
    this.pocService.pocs$
      .pipe(takeUntil(this.destroy$))
      .subscribe(pocs => {
        this.pocs = pocs ?? [];
        this.rebuildGrid();
      });

    // ✅ Subscribe to members$ from MemberService
    this.memberService.members$
      .pipe(takeUntil(this.destroy$))
      .subscribe(members => {
        this.mapAndSetRows(members ?? []);
      });

    // ✅ Trigger initial load from respective services
    if (this.selectedBranchId) {
      this.memberService.loadMembers(this.selectedBranchId);
      this.centerService.loadCenters(this.selectedBranchId);
      this.pocService.loadPocsByBranch(this.selectedBranchId);
    }
  }

  ionViewWillEnter(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
    }
  }

  ngAfterViewInit(): void { }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Re-map rows when centers/pocs arrive after members are already loaded
  private rebuildGrid(): void {
    if (this.originalRowData.length > 0) {
      this.mapAndSetRows(this.originalRowData as any[]);
    }
  }

  private mapAndSetRows(members: any[]): void {
    const centerMap = new Map<number, string>(
      this.centers.map(c => [Number(c.id), c.name])
    );
    const pocMap = new Map<number, string>(
      this.pocs.map(p => [
        Number(p.id),
        [p.firstName, p.lastName].filter(Boolean).join(' ').trim()
      ])
    );

    const raw = (members as any)?.$values ?? members;
    const list: any[] = Array.isArray(raw) ? raw : [];

    const mappedData = list.map(m => this.toGridRow(m, centerMap, pocMap));

    // Deduplicate by memberId
    const seenIds = new Set<number>();
    const uniqueData = mappedData.filter(r => {
      const id = Number((r as any)?.memberId ?? 0);
      if (!id || Number.isNaN(id)) return true;
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });

    this.rowData = uniqueData;
    this.originalRowData = [...uniqueData];

    // Feed the grid if it is already ready; otherwise onGridReady will pick up rowData
    if (this.gridApi) {
      this.gridApi.setRowData(this.rowData);
    }
  }

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

  onBranchChange(branch: Branch): void {
    this.selectedBranch = branch;
  }

  onFilterChange(event: any): void {
    const rawValue = (event?.target?.value ?? event?.detail?.value ?? '').toString();
    const searchValue = rawValue.trim().toLowerCase();

    if (!this.originalRowData || this.originalRowData.length === 0) return;

    const searchFields = ['memberId', 'memberFirstName', 'memberLastName', 'dobAge', 'address', 'memberPhone', 'center', 'poc'];

    this.rowData = searchValue === ''
      ? [...this.originalRowData]
      : this.originalRowData.filter(row =>
        searchFields.some(field => String((row as any)[field] || '').toLowerCase().includes(searchValue))
      );

    if (this.gridApi) {
      this.gridApi.setRowData(this.rowData);
    }
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    // ✅ If members already loaded before grid was ready, display them now
    if (this.rowData.length > 0) {
      this.gridApi.setRowData(this.rowData);
    }
  }

  onCellClicked(_event: any): void { }

  private toGridRow(
    member: any,
    centerMap: Map<number, string>,
    pocMap: Map<number, string>
  ): Record<string, any> {
    const m: any = member;

    const memberId = Number(m.id ?? m.Id ?? 0);
    const firstName = (m.firstName ?? m.FirstName ?? '').toString();
    const lastName = (m.lastName ?? m.LastName ?? '').toString();
    const dob = (m.dob ?? m.Dob ?? m.DOB ?? m.dateOfBirth ?? m.DateOfBirth ?? '').toString();
    const phoneNumber = (m.phoneNumber ?? m.PhoneNumber ?? '').toString();
    const guardianFirstName = (m.guardianFirstName ?? m.GuardianFirstName ?? '').toString();
    const guardianLastName = (m.guardianLastName ?? m.GuardianLastName ?? '').toString();
    const guardianPhone = (m.guardianPhone ?? m.GuardianPhone ?? '').toString();
    const centerId = Number(m.centerId ?? m.CenterId ?? m.CenterID ?? 0);
    const pocId = Number(m.pocId ?? m.POCId ?? 0);

    const pocDisplay = this.normalizeDisplayName(
      this.resolvePocNameFromMember(m) || pocMap.get(pocId) || (pocId ? String(pocId) : '')
    );

    const dobDisplay = this.formatDate(dob);
    const ageValue = (m.age ?? m.Age ?? '').toString();
    const dobAge = dobDisplay && ageValue ? `${dobDisplay} / ${ageValue}` : (dobDisplay || ageValue || '');

    const addressLine1 = (m.addressLine1 ?? m.AddressLine1 ?? '').toString();
    const addressLine2 = (m.addressLine2 ?? m.AddressLine2 ?? '').toString();
    const city = (m.city ?? m.City ?? '').toString();
    const state = (m.state ?? m.State ?? '').toString();
    const pincode = (m.pincode ?? m.Pincode ?? m.ZipCode ?? '').toString();

    const combinedAddress = (this.formatAddress(m) || [addressLine1, addressLine2, city, state, pincode]
      .filter(x => x && x.toString().trim() !== '').join(', ')).toString();

    return {
      memberId,
      memberFirstName: firstName,
      memberLastName: lastName,
      dobAge,
      memberPhone: phoneNumber,
      guardianFirstName,
      guardianLastName,
      guardianPhone,
      address: combinedAddress,
      addressLine1,
      addressLine2,
      city,
      state,
      pincode,
      center: centerMap.get(centerId) ?? '',
      poc: pocDisplay,
      loanId: m.loanId ?? null
    };
  }

  private async deleteRow(row: any): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Mark as Inactive',
      message: `Are you sure you want to mark ${row.memberFirstName} ${row.memberLastName} as inactive?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Inactive',
          role: 'destructive',
          handler: async () => await this.confirmDeleteMember(row)
        }
      ]
    });
    await alert.present();
  }

  private async confirmDeleteMember(row: any): Promise<void> {
    const loading = await this.loadingController.create({ message: 'Marking member as inactive...' });
    await loading.present();

    // inactivateMember auto-reloads members$ via tap() in MemberService
    this.memberService.deleteMember(row.memberId).subscribe({
      next: async () => {
        await loading.dismiss();
        await this.showToast('Member marked as inactive.', 'success');
      },
      error: async () => {
        await loading.dismiss();
        await this.showToast('Unable to mark member as inactive.', 'danger');
      }
    });
  }

  private formatAddress(m: any): string {
    return [m.address1 ?? m.Address1, m.address2 ?? m.Address2, m.city ?? m.City, m.state ?? m.State, m.zipCode ?? m.ZipCode]
      .filter(Boolean).join(', ');
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
    if (Array.isArray(value)) return this.normalizeDisplayName(value.find(v => v != null));
    if (typeof value === 'object') {
      const rawName = value.name ?? value.Name ?? value.fullName ?? value.FullName ?? '';
      if (typeof rawName === 'string' && rawName.trim()) return rawName.trim();
      const first = (value.firstName ?? value.FirstName ?? '').toString().trim();
      const last = (value.lastName ?? value.LastName ?? '').toString().trim();
      return [first, last].filter(Boolean).join(' ').trim() || '';
    }
    return String(value).trim();
  }

  private resolvePocNameFromMember(member: any): string {
    const fromDirect = this.normalizeDisplayName(member?.poc ?? member?.POC ?? member?.pocName ?? '');
    if (fromDirect) return fromDirect;

    const pocId = Number(member?.pocId ?? member?.POCId ?? 0);
    const centerPocs = member?.center?.poCs ?? member?.center?.POCs ?? [];
    if (pocId && Array.isArray(centerPocs)) {
      const match = centerPocs.find((p: any) => Number(p?.id ?? p?.Id ?? 0) === pocId);
      const fromCenter = this.normalizeDisplayName(match ?? '');
      if (fromCenter) return fromCenter;
    }
    return '';
  }

  // ============= MODAL METHODS =============

  async openAddMemberModal(): Promise<void> {
    const modal = await this.modalController.create({
      component: AddMemberModalComponent,
      cssClass: 'add-member-modal',
      breakpoints: [0, 0.5, 1],
      initialBreakpoint: 1
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.success) {
      await this.showToast('Member added successfully!', 'success');
      // members$ auto-refreshes via MemberService tap()
    }
  }

  async openEditMemberModal(row: any): Promise<void> {
    const modal = await this.modalController.create({
      component: EditMemberModalComponent,
      cssClass: 'edit-member-modal',
      breakpoints: [0, 0.5, 1],
      initialBreakpoint: 1,
      componentProps: { memberData: row }
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
      componentProps: { selectedMember: member }
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.loan) {
      await this.showToast('Loan added successfully!', 'success');
      // members$ auto-refreshes via MemberService tap()
    }
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 3000, color, position: 'top' });
    await toast.present();
  }
}
