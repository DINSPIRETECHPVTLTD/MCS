import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController, ToastController, LoadingController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { MemberService } from '../../services/member.service';
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
export class AddLoanComponent implements OnInit {
  activeMenu: string = 'Add Loan';
  
  // Member search (first name, last name, member ID)
  searchFirstName: string = '';
  searchLastName: string = '';
  searchMemberId: string = '';
  searchResults: Member[] = [];
  isSearching: boolean = false;
  showMemberGrid: boolean = false;
  
  // Lookup maps for center and POC names
  centerMap: Map<number, string> = new Map();
  pocMap: Map<number, string> = new Map();
  
  // AG Grid configuration
  rowData: Member[] = [];
  columnDefs: ColDef[] = [
    {
      headerName: 'Member ID',
      valueGetter: (params) => {
        const data = params.data as Member;
        return data?.memberId ?? data?.id ?? '';
      },
      width: 120,
      sortable: true,
      filter: true
    },
    {
      headerName: 'Full Name',
      valueGetter: (params) => {
        const data = params.data as Member;
        const firstName = data?.firstName ?? '';
        const lastName = data?.lastName ?? '';
        return `${firstName} ${lastName}`.trim() || 'N/A';
      },
      width: 200,
      sortable: true,
      filter: true
    },
    {
      headerName: 'Center Name',
      valueGetter: (params) => {
        const data = params.data as Member;
        const comp = (params.context as { component?: AddLoanComponent })?.component;
        const centerId = data?.centerId;
        return centerId && comp ? (comp.centerMap.get(centerId) ?? `Center ${centerId}`) : 'N/A';
      },
      width: 180,
      sortable: true,
      filter: true
    },
    {
      headerName: 'POC Name',
      valueGetter: (params) => {
        const data = params.data as Member;
        const comp = (params.context as { component?: AddLoanComponent })?.component;
        const pocId = data?.pocId;
        return pocId && comp ? (comp.pocMap.get(pocId) ?? `POC ${pocId}`) : 'N/A';
      },
      width: 180,
      sortable: true,
      filter: true
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
  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true
  };
  pagination: boolean = true;
  paginationPageSize: number = 20;

  private gridApi?: GridApi;
  gridOptions = { theme: agGridTheme };
  /** Passed to AG Grid so Select button can call back into this component */
  get gridContext(): { component: AddLoanComponent } {
    return { component: this };
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    private memberService: MemberService,
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
    // Load lookup data and then recent members
    this.loadLookupsAndMembers();
  }

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

  onBranchChange(_branch: Branch): void {
    // Handle branch change if needed
    // Reload recent members for the new branch

  }

  async loadLookupsAndMembers(): Promise<void> {
    await this.loadLookups();
    await this.loadRecentMembers();
  }

  async loadLookups(): Promise<void> {
    const branchId = this.authService.getBranchId();
    if (!branchId) {
      return;
    }

    try {
      // Load centers
      const centers = await this.memberService.getAllCenters().toPromise();
      if (centers) {
        this.centerMap.clear();
        centers.forEach(center => {
          this.centerMap.set(center.id, center.name);
        });
      }

      // Load POCs
      const pocs = await this.memberService.getAllPOCs().toPromise();
      if (pocs) {
        this.pocMap.clear();
        pocs.forEach(poc => {
          const pocName = poc.name || `${poc.firstName || ''} ${poc.lastName || ''}`.trim();
          this.pocMap.set(poc.id, pocName);
        });
      }
    } catch (error) {
      console.error('Error loading lookups:', error);
    }
  }

  async loadRecentMembers(): Promise<void> {
    const branchId = this.authService.getBranchId();
    if (!branchId) {
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Loading recent members...',
      spinner: 'crescent'
    });
    await loading.present();

    this.memberService.getMembersByBranch(branchId).subscribe({
      next: (members: Member[]) => {
        // Filter members created in the last 10 days
        const tenDaysAgo = new Date();
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
        
        const recentMembers = members.filter(member => {
          if (member.createdAt) {
            const createdDate = new Date(member.createdAt);
            return createdDate >= tenDaysAgo;
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
      error: (error: unknown) => {
        console.error('Error loading recent members:', error);
        loading.dismiss();
        this.toastController.create({
          message: 'Error loading recent members. Use search to find members.',
          duration: 3000,
          color: 'warning',
          position: 'top'
        }).then(toast => toast.present());
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
        duration: 2000,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    this.isSearching = true;
    const loading = await this.loadingController.create({
      message: 'Searching members...',
      spinner: 'crescent'
    });
    await loading.present();

    // Ensure lookups are loaded
    if (this.centerMap.size === 0 || this.pocMap.size === 0) {
      await this.loadLookups();
    }

    this.memberService.searchMembersByCriteria({
      firstName: first || undefined,
      lastName: last || undefined,
      memberId: id || undefined
    }).subscribe({
      next: (members: Member[]) => {
        this.searchResults = members;
        this.rowData = members;
        this.showMemberGrid = true;
        loading.dismiss();
        this.isSearching = false;

        if (members.length === 0) {
          this.toastController.create({
            message: 'No members found',
            duration: 2000,
            color: 'warning',
            position: 'top'
          }).then(toast => toast.present());
        } else {
          setTimeout(() => {
            this.gridApi?.sizeColumnsToFit();
            this.gridApi?.refreshCells({ force: true });
          }, 100);
        }
      },
      error: (error: unknown) => {
        console.error('Error searching members:', error);
        loading.dismiss();
        this.isSearching = false;
        this.toastController.create({
          message: 'Error searching members. Please try again.',
          duration: 3000,
          color: 'danger',
          position: 'top'
        }).then(toast => toast.present());
      }
    });
  }

  /** Called when user clicks Select on a row; opens loan modal */
  async selectMemberFromGrid(member: Member): Promise<void> {
    const modal = await this.modalController.create({
      component: AddLoanModalComponent,
      componentProps: {
        selectedMember: member
      },
      cssClass: 'loan-modal'
    });

    await modal.present();
    
    const { data, role } = await modal.onWillDismiss();
    
    if (role === 'success' && data && data.reset) {
      // Reset search fields and reload recent members
      this.searchFirstName = '';
      this.searchLastName = '';
      this.searchMemberId = '';
      // Reload recent members to refresh the list
      await this.loadRecentMembers();
    }
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.setGridOption('context', { component: this });
    if (this.rowData && this.rowData.length > 0) {
      this.gridApi.setGridOption('rowData', this.rowData);
    }
    setTimeout(() => {
      this.gridApi?.sizeColumnsToFit();
    }, 100);
  }

  onSearchKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.searchMembers();
    }
  }
}
