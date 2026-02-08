import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { UserContextService } from '../../services/user-context.service';
import { LoanService } from '../../services/loan.service';
import { Branch } from '../../models/branch.models';
import { Loan } from '../../models/loan.models';
import { ToastController, LoadingController } from '@ionic/angular';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { agGridTheme } from '../../ag-grid-theme';

@Component({
  selector: 'app-manage-loan',
  templateUrl: './manage-loan.page.html',
  styleUrls: ['./manage-loan.page.scss']
})
export class ManageLoanComponent implements OnInit, ViewWillEnter {
  activeMenu: string = 'Manage Loan';
  loans: Loan[] = [];
  rowData: Loan[] = [];
  selectedBranch: Branch | null = null;
  isLoading: boolean = false;

  columnDefs: ColDef[] = [
    { headerName: 'Loan ID', valueGetter: (p) => (p.data as Loan)?.loanId ?? '', width: 100, filter: 'agNumberColumnFilter', sortable: true },
    { headerName: 'Loan Code', field: 'loanCode', width: 120, filter: 'agTextColumnFilter', sortable: true },
    { headerName: 'Member ID', field: 'memberId', width: 110, filter: 'agNumberColumnFilter', sortable: true },
    { headerName: 'Loan Amount', valueGetter: (p) => (p.data as Loan)?.loanAmount ?? 0, width: 130, filter: 'agNumberColumnFilter', sortable: true, valueFormatter: (p) => p.value != null ? Number(p.value).toFixed(2) : '' },
    { headerName: 'Interest', valueGetter: (p) => (p.data as Loan)?.interestAmount ?? 0, width: 110, filter: 'agNumberColumnFilter', sortable: true, valueFormatter: (p) => p.value != null ? Number(p.value).toFixed(2) : '' },
    { headerName: 'Processing Fee', valueGetter: (p) => (p.data as Loan)?.processingFee ?? 0, width: 120, filter: 'agNumberColumnFilter', sortable: true, valueFormatter: (p) => p.value != null ? Number(p.value).toFixed(2) : '' },
    { headerName: 'Insurance Fee', valueGetter: (p) => (p.data as Loan)?.insuranceFee ?? 0, width: 120, filter: 'agNumberColumnFilter', sortable: true, valueFormatter: (p) => p.value != null ? Number(p.value).toFixed(2) : '' },
    { headerName: 'Saving', valueGetter: (p) => (p.data as Loan)?.isSavingEnabled ? 'Yes' : 'No', width: 80, filter: 'agTextColumnFilter', sortable: true },
    { headerName: 'Saving Amount', valueGetter: (p) => (p.data as Loan)?.savingAmount ?? 0, width: 120, filter: 'agNumberColumnFilter', sortable: true, valueFormatter: (p) => p.value != null ? Number(p.value).toFixed(2) : '' },
    {
      headerName: 'Actions',
      width: 100,
      sortable: false,
      filter: false,
      cellRenderer: (params: { data: Loan; context?: { component: ManageLoanComponent } }) => {
        const btn = document.createElement('button');
        btn.className = 'ag-btn ag-view-btn';
        btn.textContent = 'View';
        const comp = (params.context as { component?: ManageLoanComponent })?.component ?? this;
        btn.addEventListener('click', () => comp.viewLoan(params.data));
        return btn;
      }
    }
  ];
  defaultColDef: ColDef = { sortable: true, filter: true, resizable: true };
  pagination = true;
  paginationPageSize = 20;
  paginationPageSizeSelector: number[] = [10, 20, 50, 100];
  private gridApi?: GridApi;
  gridOptions = { theme: agGridTheme, getRowNodeId: (data: Loan) => String(data.loanId ?? data.loanCode ?? '') };
  get gridContext(): { component: ManageLoanComponent } {
    return { component: this };
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    private userContext: UserContextService,
    private loanService: LoanService,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) { }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
  }

  ionViewWillEnter(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadLoansForCurrentBranch();
  }

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

  onBranchChange(branch: Branch): void {
    this.selectedBranch = branch;
    if (branch?.id != null) {
      this.loadLoansByBranch(branch.id);
    } else {
      this.loans = [];
      this.rowData = [];
      if (this.gridApi) this.gridApi.setGridOption('rowData', []);
    }
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.setGridOption('context', { component: this });
    if (this.rowData?.length) {
      this.gridApi.setGridOption('rowData', this.rowData);
    }
    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);
  }

  viewLoan(loan: Loan): void {
    const id = loan.loanId ?? (loan as { id?: number }).id;
    if (id != null) {
      this.router.navigate(['/loan-detail', id]);
    } else {
      this.toastController.create({
        message: 'Cannot view: loan ID not available',
        duration: 2000,
        color: 'warning',
        position: 'top'
      }).then(toast => toast.present());
    }
  }

  /** Exposed for template; returns current branch ID from selection, context, or localStorage */
  getCurrentBranchId(): number | null {
    const fromSelection = this.selectedBranch?.id;
    if (fromSelection != null) return fromSelection;
    const fromContext = this.userContext.branchId;
    if (fromContext != null) return fromContext;
    try {
      const stored = localStorage.getItem('selected_branch_id');
      if (stored) {
        const num = Number(stored);
        return Number.isNaN(num) ? null : num;
      }
    } catch (_) {}
    return null;
  }

  private loadLoansForCurrentBranch(): void {
    const branchId = this.getCurrentBranchId();
    if (branchId != null) {
      this.loadLoansByBranch(branchId);
    } else {
      this.loans = [];
    }
  }

  private async loadLoansByBranch(branchId: number): Promise<void> {
    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Loading loans...',
      spinner: 'crescent'
    });
    await loading.present();

    this.loanService.getLoansByBranch(branchId).subscribe({
      next: (list: Loan[]) => {
        this.loans = list ?? [];
        this.rowData = [...this.loans];
        if (this.gridApi) {
          this.gridApi.setGridOption('rowData', this.rowData);
          setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);
        }
        if (this.loans.length === 0) {
          this.toastController.create({
            message: 'No loans found for this branch',
            duration: 2000,
            color: 'medium',
            position: 'top'
          }).then(toast => toast.present());
        }
      },
      error: (err: unknown) => {
        this.loans = [];
        this.rowData = [];
        if (this.gridApi) this.gridApi.setGridOption('rowData', []);
        console.error('Error loading loans by branch:', err);
        this.toastController.create({
          message: 'Failed to load loans. Please try again.',
          duration: 3000,
          color: 'danger',
          position: 'top'
        }).then(toast => toast.present());
      },
      complete: () => {
        loading.dismiss().catch(() => {});
        this.isLoading = false;
      }
    });
  }
}
