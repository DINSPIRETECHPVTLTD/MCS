import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController, ToastController, LoadingController } from '@ionic/angular';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { MemberService } from '../../services/member.service';
import { CenterService } from '../../services/center.service';
import { PocService } from '../../services/poc.service';
import { Member } from '../../models/member.models';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { agGridTheme } from '../../ag-grid-theme';
import { Branch } from '../../models/branch.models';
import { AddLoanModalComponent } from './add-loan-modal.component';

@Component({
  selector: 'app-add-loan',
  templateUrl: './add-loan.page.html',
  styleUrls: ['./add-loan.page.scss']
})
export class AddLoanComponent implements OnInit, OnDestroy {
  activeMenu: string = 'Add Loan';

  // Member search
  searchFirstName: string = '';
  searchLastName: string = '';
  searchMemberId: string = '';
  searchResults: Member[] = [];
  isSearching: boolean = false;
  showMemberGrid: boolean = false;

  // Lookup maps for center and POC names — built from BehaviorSubject caches
  centerMap: Map<number, string> = new Map();
  pocMap: Map<number, string> = new Map();

  // AG Grid
  rowData: Member[] = [];
  columnDefs: ColDef[] = [
    {
      headerName: 'Member ID',
      valueGetter: (params) => {
        const data = params.data as Member;
        return data?.memberId ?? data?.id ?? '';
      },
      width: 120, sortable: true, filter: true
    },
    {
      headerName: 'Full Name',
      valueGetter: (params) => {
        const data = params.data as Member;
        return `${data?.firstName ?? ''} ${data?.lastName ?? ''}`.trim() || 'N/A';
      },
      width: 200, sortable: true, filter: true
    },
    {
      headerName: 'Center Name',
      valueGetter: (params) => {
        const data = params.data as Member;
        const comp = (params.context as { component?: AddLoanComponent })?.component;
        const centerId = data?.centerId;
        return centerId && comp ? (comp.centerMap.get(centerId) ?? `Center ${centerId}`) : 'N/A';
      },
      width: 180, sortable: true, filter: true
    },
    {
      headerName: 'POC Name',
      valueGetter: (params) => {
        const data = params.data as Member;
        const comp = (params.context as { component?: AddLoanComponent })?.component;
        const pocId = data?.pocId;
        return pocId && comp ? (comp.pocMap.get(pocId) ?? `POC ${pocId}`) : 'N/A';
      },
      width: 180, sortable: true, filter: true
    },
    {
      headerName: 'Select',
      width: 100,
      sortable: false,
      filter: false,
      cellRenderer: (params: { data: Member; context?: { component: AddLoanComponent } }) => {
        const btn = document.createElement('button');
        btn.className = 'ag-select-btn';
        btn.textContent = 'Select';
        const comp = (params.context as { component?: AddLoanComponent })?.component ?? this;
        btn.addEventListener('click', () => comp.selectMemberFromGrid(params.data));
        return btn;
      }
    }
  ];
  defaultColDef: ColDef = { resizable: true, sortable: true, filter: true };
  pagination: boolean = true;
  paginationPageSize: number = 20;

  private gridApi?: GridApi;
  gridOptions = { theme: agGridTheme };

  get gridContext(): { component: AddLoanComponent } {
    return { component: this };
  }

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router,
    private memberService: MemberService,
    private centerService: CenterService,
    private pocService: PocService,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private modalController: ModalController,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    const branchId = this.authService.getBranchId();

    // ✅ Build centerMap from CenterService.centers$ — no extra HTTP call
    this.centerService.centers$
      .pipe(takeUntil(this.destroy$))
      .subscribe(centers => {
        this.centerMap.clear();
        (centers ?? []).forEach(c => {
          if (c.id != null) this.centerMap.set(c.id, c.name);
        });
        this.gridApi?.refreshCells({ force: true });
      });

    // ✅ Build pocMap from PocService.pocs$ — no extra HTTP call
    this.pocService.pocs$
      .pipe(takeUntil(this.destroy$))
      .subscribe(pocs => {
        this.pocMap.clear();
        (pocs ?? []).forEach(p => {
          if (p.id != null) {
            const name = [p.firstName, p.lastName].filter(Boolean).join(' ').trim();
            this.pocMap.set(p.id, name || `POC ${p.id}`);
          }
        });
        this.gridApi?.refreshCells({ force: true });
      });

    // ✅ Trigger loads only if caches are empty (avoids duplicate calls if already loaded)
    if (branchId) {
      if ((this.centerService as any).centersSubject?.getValue?.()?.length === 0) {
        this.centerService.loadCenters(branchId);
      }
      if ((this.pocService as any).pocsSubject?.getValue?.()?.length === 0) {
        this.pocService.loadPocsByBranch(branchId);
      }
    }

    this.loadRecentMembers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

  onBranchChange(_branch: Branch): void { }

  async loadRecentMembers(): Promise<void> {
    const branchId = this.authService.getBranchId();
    if (!branchId) return;

    const loading = await this.loadingController.create({
      message: 'Loading recent members...',
      spinner: 'crescent'
    });
    await loading.present();

    this.memberService.getMembersByBranch(branchId).subscribe({
      next: (members: Member[]) => {
        // Show members created in the last 10 days
        const tenDaysAgo = new Date();
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

        const recentMembers = members.filter(member => {
          if (member.createdAt) {
            return new Date(member.createdAt) >= tenDaysAgo;
          }
          return false;
        });

        this.rowData = recentMembers;
        this.searchResults = recentMembers;
        this.showMemberGrid = recentMembers.length > 0;
        loading.dismiss();

        if (recentMembers.length > 0) {
          setTimeout(() => {
            this.gridApi?.sizeColumnsToFit();
            this.gridApi?.refreshCells({ force: true });
          }, 100);
        }
      },
      error: () => {
        loading.dismiss();
        this.toastController.create({
          message: 'Error loading recent members. Use search to find members.',
          duration: 3000, color: 'warning', position: 'top'
        }).then(t => t.present());
      }
    });
  }

  async searchMembers(): Promise<void> {
    const first = this.searchFirstName?.trim() ?? '';
    const last = this.searchLastName?.trim() ?? '';
    const id = this.searchMemberId?.trim() ?? '';

    if (!first && !last && !id) {
      const toast = await this.toastController.create({
        message: 'Enter at least one search: First Name, Last Name, or Member ID',
        duration: 2000, color: 'warning', position: 'top'
      });
      await toast.present();
      return;
    }

    this.isSearching = true;
    const loading = await this.loadingController.create({
      message: 'Searching members...', spinner: 'crescent'
    });
    await loading.present();

    try {
      const branchId = this.authService.getBranchId();
      // ✅ Get all members for branch from MemberService, then filter client-side
      const all = await firstValueFrom(this.memberService.getMembersByBranch(branchId!));
      const q = { first: first.toLowerCase(), last: last.toLowerCase(), id: id.toLowerCase() };

      const matched = (all ?? []).filter(m => {
        const mFirst = (m.firstName ?? '').toLowerCase();
        const mLast = (m.lastName ?? '').toLowerCase();
        const mId = String(m.id ?? m.memberId ?? '');
        const matchFirst = !q.first || mFirst.includes(q.first);
        const matchLast = !q.last || mLast.includes(q.last);
        const matchId = !q.id || mId.includes(q.id);
        return matchFirst && matchLast && matchId;
      });

      this.searchResults = matched;
      this.rowData = matched;
      this.showMemberGrid = true;
      loading.dismiss();
      this.isSearching = false;

      if (matched.length === 0) {
        this.toastController.create({
          message: 'No members found',
          duration: 2000, color: 'warning', position: 'top'
        }).then(t => t.present());
      } else {
        setTimeout(() => {
          this.gridApi?.sizeColumnsToFit();
          this.gridApi?.refreshCells({ force: true });
        }, 100);
      }
    } catch {
      loading.dismiss();
      this.isSearching = false;
      this.toastController.create({
        message: 'Error searching members. Please try again.',
        duration: 3000, color: 'danger', position: 'top'
      }).then(t => t.present());
    }
  }

  async selectMemberFromGrid(member: Member): Promise<void> {
    const modal = await this.modalController.create({
      component: AddLoanModalComponent,
      componentProps: { selectedMember: member },
      cssClass: 'loan-modal'
    });
    await modal.present();

    const { data, role } = await modal.onWillDismiss();
    if (role === 'success' && data?.reset) {
      this.searchFirstName = '';
      this.searchLastName = '';
      this.searchMemberId = '';
      await this.loadRecentMembers();
    }
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.setGridOption('context', { component: this });
    if (this.rowData?.length > 0) {
      this.gridApi.setGridOption('rowData', this.rowData);
    }
    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);
  }

  onSearchKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.searchMembers();
  }
}
