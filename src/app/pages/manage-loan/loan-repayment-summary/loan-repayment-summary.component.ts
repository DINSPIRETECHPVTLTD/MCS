import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { LoanService } from '../../../services/loan.service';
import { RecoveryPostingService } from '../../../services/recovery-posting.service';
import { Loan } from '../../../models/loan.models';
import { RepaymentScheduleRowDto } from '../../../models/loan-repayment-summary.models';
import { LoadingController, ToastController } from '@ionic/angular';
import { ColDef, GridApi, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { agGridTheme } from '../../../ag-grid-theme';

@Component({
  selector: 'app-loan-repayment-summary',
  templateUrl: './loan-repayment-summary.component.html',
  styleUrls: ['./loan-repayment-summary.component.scss']
})
export class LoanRepaymentSummaryComponent implements OnInit {
  activeMenu = 'Manage Loan';
  loanId: number | null = null;
  loan: Loan | null = null;
  scheduleRows: RepaymentScheduleRowDto[] = [];
  hasSchedule = false;
  totalAmountPaid = 0;
  remainingBalance = 0;
  weeklyDue = 0;
  isLoading = true;
  loadError: string | null = null;

  columnDefs: ColDef<RepaymentScheduleRowDto>[] = [
    { headerName: 'Week No', field: 'weekNo', width: 100, sortable: true },
    {
      headerName: 'Collection Date',
      field: 'collectionDate',
      width: 140,
      sortable: true,
      valueFormatter: (p) => this.formatDate(p.value)
    },
    {
      headerName: 'Paid Date',
      field: 'paidDate',
      width: 140,
      sortable: true,
      valueFormatter: (p) => this.formatPaidDate(p.value)
    },
    { headerName: 'Payment Status', field: 'paymentStatus', width: 130, sortable: true },
    {
      headerName: 'Paid Amount',
      field: 'paidAmount',
      width: 120,
      sortable: true,
      valueFormatter: (p) => (p.value != null ? Number(p.value).toFixed(2) : '0.00')
    },
    {
      headerName: 'Reasons',
      field: 'reasons',
      flex: 1,
      minWidth: 160,
      sortable: true,
      valueFormatter: (p) => this.formatReasons(p.value)
    }
  ];
  defaultColDef: ColDef = { sortable: true, resizable: true };
  gridOptions: GridOptions<RepaymentScheduleRowDto> = {
    theme: agGridTheme,
    domLayout: 'autoHeight'
  };

  private gridApi: GridApi<RepaymentScheduleRowDto> | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private loanService: LoanService,
    private recoveryPostingService: RecoveryPostingService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    const id = this.route.snapshot.paramMap.get('loanId');
    this.loanId = id ? parseInt(id, 10) : null;
    if (this.loanId == null || isNaN(this.loanId)) {
      this.loadError = 'Invalid loan ID';
      this.isLoading = false;
      return;
    }
    this.loadData();
  }

  private loadData(): void {
    this.isLoading = true;
    this.loadError = null;
    this.loanService.getLoanById(this.loanId!).subscribe({
      next: (loan) => {
        this.loan = loan;
        this.recoveryPostingService.getSchedulerByLoanId(this.loanId!).subscribe({
          next: (rows) => {
            if (rows && rows.length > 0) {
              rows.sort((a, b) => a.weekNo - b.weekNo);
              this.scheduleRows = rows;
              this.hasSchedule = true;
            } else {
              this.scheduleRows = [];
              this.hasSchedule = false;
            }
            this.computeSummary(loan);
            this.isLoading = false;
            setTimeout(() => this.gridApi?.setGridOption('rowData', this.scheduleRows), 0);
          },
          error: () => {
            this.scheduleRows = [];
            this.hasSchedule = false;
            this.computeSummary(loan);
            this.isLoading = false;
            setTimeout(() => this.gridApi?.setGridOption('rowData', this.scheduleRows), 0);
          }
        });
      },
      error: () => {
        this.loadError = 'Failed to load loan details.';
        this.isLoading = false;
      }
    });
  }

  private computeSummary(loan: Loan): void {
    const totalPaid = this.scheduleRows.reduce((sum, r) => sum + (r.paidAmount ?? 0), 0);
    const total = loan.totalAmount ?? 0;
    const terms = loan.noOfTerms && loan.noOfTerms > 0 ? loan.noOfTerms : 1;
    this.totalAmountPaid = Math.round(totalPaid * 100) / 100;
    this.remainingBalance = Math.round((total - totalPaid) * 100) / 100;
    this.weeklyDue = Math.round((total / terms) * 100) / 100;
  }

  private formatDate(value: string | null | undefined): string {
    if (!value) return '';
    const d = new Date(value);
    return isNaN(d.getTime()) ? value : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  /** Paid Date: show '-' for null or default sentinel (0001-01-01), else dd-MM-yyyy. */
  private formatPaidDate(value: string | null | undefined): string {
    if (value == null || value === '') return '-';
    const v = String(value).trim();
    if (v === '' || v.startsWith('0001-01-01')) return '-';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  /** Reasons: show '-' if null or empty. */
  private formatReasons(value: string | null | undefined): string {
    if (value == null) return '-';
    const v = String(value).trim();
    return v === '' ? '-' : v;
  }

  onGridReady(params: GridReadyEvent<RepaymentScheduleRowDto>): void {
    this.gridApi = params.api;
    params.api.setGridOption('rowData', this.scheduleRows);
  }

  goBack(): void {
    this.router.navigate(['/manage-loan']);
  }

  onMenuChange(_menu: string): void {
    // Header menu change; no-op on this read-only page
  }

  onBranchChange(_branch?: unknown): void {
    // Branch change; no-op on this read-only page
  }
}
