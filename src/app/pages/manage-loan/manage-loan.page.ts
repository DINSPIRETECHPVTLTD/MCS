import { Component, OnInit } from '@angular/core';
import { NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { UserContextService } from '../../services/user-context.service';
import { LoanService } from '../../services/loan.service';
import { Branch } from '../../models/branch.models';
import { Loan, ActiveLoanSummaryDto } from '../../models/loan.models';
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
  loans: ActiveLoanSummaryDto[] = [];
  rowData: ActiveLoanSummaryDto[] = [];
  selectedBranch: Branch | null = null;
  isLoading: boolean = false;

  // Search filter properties
  searchFilters = {
    firstName: '',
    surname: '',
    loanId: ''
  };

  columnDefs: ColDef[] = [
    { 
      headerName: 'Member Name', 
      field: 'memberName', 
      width: 200, 
      sortable: true,
      editable: false
    },
    { 
      headerName: 'Total Amount', 
      field: 'totalAmount', 
      width: 150, 
      sortable: true, 
      valueFormatter: (p) => p.value != null ? Number(p.value).toFixed(2) : '',
      editable: false
    },
    { 
      headerName: 'No. of Weeks Paid', 
      valueGetter: (p) => {
        const loan = p.data as ActiveLoanSummaryDto;
        const paidWeeks = loan?.numberOfPaidEmis || 0;
        const totalWeeks = loan?.noOfTerms || 0;
        return `${paidWeeks} / ${totalWeeks}`;
      }, 
      width: 150, 
      sortable: true,
      editable: false
    },
    { 
      headerName: 'Total Amount Paid', 
      field: 'totalPaidAmount', 
      width: 160, 
      sortable: true, 
      valueFormatter: (p) => p.value != null ? Number(p.value).toFixed(2) : '',
      editable: false
    },
    { 
      headerName: 'Remaining Balance', 
      field: 'totalUnpaidAmount', 
      width: 160, 
      sortable: true, 
      valueFormatter: (p) => p.value != null ? Number(p.value).toFixed(2) : '',
      editable: false
    },
    {
      headerName: 'Actions',
      width: 250,
      cellRenderer: (params: any) => {
        const container = document.createElement('div');
        container.className = 'actions-cell';
        
        const viewBtn = document.createElement('button');
        viewBtn.type = 'button';
        viewBtn.className = 'ag-btn ag-navigate';
        viewBtn.textContent = 'View Loan';
        
        const prepaymentBtn = document.createElement('button');
        prepaymentBtn.type = 'button';
        prepaymentBtn.className = 'ag-btn ag-edit';
        prepaymentBtn.textContent = 'Prepayment';
        
        const comp = (params.context as { component?: ManageLoanComponent })?.component ?? this;
        viewBtn.addEventListener('click', () => comp.viewLoan(params.data));
        prepaymentBtn.addEventListener('click', () => comp.prepaymentLoan(params.data));
        
        container.appendChild(viewBtn);
        container.appendChild(prepaymentBtn);
        return container;
      },
      sortable: false,
      filter: false,
      resizable: false
    }
  ];
  defaultColDef: ColDef = { sortable: true, filter: false, resizable: true };
  pagination = true;
  paginationPageSize = 20;
  paginationPageSizeSelector: number[] = [10, 20, 50, 100];
  private gridApi?: GridApi;
  gridOptions = { theme: agGridTheme, getRowNodeId: (data: ActiveLoanSummaryDto) => String(data.loanId ?? '') };
  get gridContext(): { component: ManageLoanComponent } {
    return { component: this };
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    private ngZone: NgZone,
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
    this.loadActiveLoans();
  }

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

  onBranchChange(branch: Branch): void {
    this.selectedBranch = branch;
    // No need to reload data since activeloansummary returns all loans regardless of branch
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.setGridOption('context', { component: this });
    if (this.rowData?.length) {
      this.gridApi.setGridOption('rowData', this.rowData);
    }
    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);
  }

  viewLoan(loan: ActiveLoanSummaryDto): void {
    const id = loan.loanId;
    if (id != null) {
      this.ngZone.run(() => {
        this.router.navigate(['/manage-loan', 'repayment-summary', String(id)], { replaceUrl: true });
      });
    } else {
      this.ngZone.run(() => {
        this.toastController.create({
          message: 'Cannot view: loan ID not available',
          duration: 2000,
          color: 'warning',
          position: 'top'
        }).then(toast => toast.present());
      });
    }
  }

  prepaymentLoan(loan: ActiveLoanSummaryDto): void {
    const id = loan.loanId;
    if (id != null) {
      this.ngZone.run(() => {
        this.router.navigate(['/preclose-loan'], { 
          queryParams: { loanId: id, memberName: loan.memberName },
          replaceUrl: true 
        });
      });
    } else {
      this.ngZone.run(() => {
        this.toastController.create({
          message: 'Cannot initiate prepayment: loan ID not available',
          duration: 2000,
          color: 'warning',
          position: 'top'
        }).then(toast => toast.present());
      });
    }
  }

  applySearch(): void {
    if (!this.loans?.length) {
      this.rowData = [];
      if (this.gridApi) {
        this.gridApi.setGridOption('rowData', this.rowData);
      }
      return;
    }

    let filteredLoans = [...this.loans];

    // Filter by first name
    if (this.searchFilters.firstName.trim()) {
      filteredLoans = filteredLoans.filter(loan => 
        this.extractFirstName(loan.memberName)
          .toLowerCase()
          .includes(this.searchFilters.firstName.trim().toLowerCase())
      );
    }

    // Filter by surname 
    if (this.searchFilters.surname.trim()) {
      filteredLoans = filteredLoans.filter(loan => 
        this.extractSurname(loan.memberName)
          .toLowerCase()
          .includes(this.searchFilters.surname.trim().toLowerCase())
      );
    }

    // Filter by loan ID
    if (this.searchFilters.loanId.trim()) {
      filteredLoans = filteredLoans.filter(loan => 
        loan.loanId?.toString().includes(this.searchFilters.loanId.trim())
      );
    }

    this.rowData = filteredLoans;
    if (this.gridApi) {
      this.gridApi.setGridOption('rowData', this.rowData);
    }
  }

  clearSearch(): void {
    this.searchFilters = {
      firstName: '',
      surname: '',
      loanId: ''
    };
    this.rowData = [...this.loans];
    if (this.gridApi) {
      this.gridApi.setGridOption('rowData', this.rowData);
    }
  }

  private extractFirstName(fullName: string): string {
    if (!fullName) return '';
    const nameParts = fullName.trim().split(' ');
    return nameParts[0] || '';
  }

  private extractSurname(fullName: string): string {
    if (!fullName) return '';
    const nameParts = fullName.trim().split(' ');
    return nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
  }



  private async loadActiveLoans(): Promise<void> {
    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Loading loans...',
      spinner: 'crescent'
    });
    await loading.present();

    this.loanService.getActiveLoanSummary().subscribe({
      next: (list: ActiveLoanSummaryDto[]) => {
        this.loans = list ?? [];
        this.rowData = [...this.loans];
        
        // Apply any existing search filters after data loads
        this.applySearch();
        
        // Debug: Log first loan to see what fields API returns
        if (this.loans.length > 0) {
          console.log('Sample loan from API:', this.loans[0]);
          console.log('Available fields:', Object.keys(this.loans[0]));
        }
        
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
