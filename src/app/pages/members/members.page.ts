import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { forkJoin } from 'rxjs';
import { Router } from '@angular/router';
import { ViewWillEnter, ModalController, ToastController, LoadingController } from '@ionic/angular';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { AuthService } from '../../services/auth.service';
import { UserContextService } from '../../services/user-context.service';
import { MemberService } from '../../services/member.service';
import { Branch } from '../../models/branch.models';
import { CenterOption, Member, POCOption } from '../../models/member.models';
import { AddMemberModalComponent } from './add-member-modal.component';

@Component({
  selector: 'app-members',
  templateUrl: './members.page.html',
  styleUrls: ['./members.page.scss']
})
export class MembersPage implements OnInit, ViewWillEnter, AfterViewInit {
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
  displayedColumns: string[] = [
    'memberFirstName',
    'memberMiddleName',
    'memberLastName',
    'memberDob',
    'memberAge',
    'memberPhone',
    'memberAddress',
    'memberAadhaar',
    'memberOccupation',
    'memberStatus',
    'guardianName',
    'guardianAge',
    'branch',
    'center',
    'poc'
  ];
  dataSource = new MatTableDataSource<Record<string, any>>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private authService: AuthService,
    private userContext: UserContextService,
    private memberService: MemberService,
    private router: Router,
    private modalController: ModalController,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) { }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.dataSource.filterPredicate = (data: Record<string, any>, filter: string) => {
      const normalized = filter.trim().toLowerCase();
      if (!normalized) return true;
      return Object.values(data).some(value =>
        (value ?? '').toString().toLowerCase().includes(normalized)
      );
    };
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
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  onFilterChange(event: any): void {
    const value = event?.target?.value ?? event?.detail?.value ?? '';
    this.dataSource.filter = value.toString().trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

  onBranchChange(branch: Branch): void {
    this.selectedBranch = branch;
    this.selectedCenterId = null;
    this.rowData = [];
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
      this.dataSource.data = [];
      return;
    }

    this.isLoadingMembers = true;

    const loading = await this.loadingController.create({ message: 'Loading members...' });
    await loading.present();

    forkJoin({
      centers: this.memberService.getAllCenters(),
      pocs: this.memberService.getAllPOCs(),
      members: this.memberService.getAllMembers()
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
        this.rowData = filtered.map(m => this.toGridRow(m as any, centerMap, pocMap));
        this.dataSource.data = this.rowData;
      },
      error: async () => {
        await loading.dismiss();
        this.isLoadingMembers = false;
        this.rowData = [];
        this.dataSource.data = [];
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
      memberFirstName: firstName,
      memberMiddleName: middleName,
      memberLastName: lastName,
      memberDob: dob,
      memberAge: m.age ?? m.Age ?? '',
      memberPhone: phoneNumber,
      memberAddress: this.formatAddress(m),
      memberAadhaar: m.aadhaar ?? m.Aadhaar ?? '',
      memberOccupation: m.occupation ?? m.Occupation ?? '',
      memberStatus: m.status ?? m.Status ?? '',
      guardianName,
      guardianAge: m.guardianAge ?? m.GuardianAge ?? '',
      branch: this.selectedBranch?.name ?? '',
      center: centerMap.get(centerId) ?? '',
      poc: pocDisplay
    };
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
      console.log('Member created:', data.member);
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
}

