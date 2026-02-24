import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoanService } from '../../../services/loan.service';
import { RecoveryPostingService } from '../../../services/recovery-posting.service';
import { AuthService } from '../../../services/auth.service';
import { Loan, RepaymentScheduleRow } from '../../../models/loan.models';
import { Branch } from '../../../models/branch.models';
import { ToastController, LoadingController } from '@ionic/angular';
import { map, switchMap } from 'rxjs/operators';
import { LoanSchedulerRecoveryDto } from '../../../models/recovery-posting.models';

@Component({
  selector: 'app-loan-repayment-summary',
  templateUrl: './loan-repayment-summary.component.html',
  styleUrls: ['./loan-repayment-summary.component.scss']
})
export class LoanRepaymentSummaryComponent implements OnInit {
  activeMenu = 'Manage Loan';
  loanId: number | null = null;
  loan: Loan | null = null;
  scheduleRows: RepaymentScheduleRow[] = [];
  totalAmountPaid = 0;
  remainingBalance = 0;
  weeklyDue = 0;
  isLoading = true;
  loadError: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private loanService: LoanService,
    private recoveryPostingService: RecoveryPostingService,
    private authService: AuthService,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    const idParam = this.route.snapshot.paramMap.get('loanId');
    const id = idParam ? parseInt(idParam, 10) : NaN;
    if (!idParam || isNaN(id)) {
      this.loadError = 'Invalid loan ID';
      this.isLoading = false;
      return;
    }
    this.loanId = id;
    this.loadData();
  }

  private loadData(): void {
    if (this.loanId == null) return;
    this.isLoading = true;
    this.loadError = null;
    const loanId = this.loanId;
    this.loadingController.create({ message: 'Loading repayment summary...', spinner: 'crescent' }).then(loading => {
      loading.present();
      this.loanService.getLoanById(loanId).pipe(
        switchMap(loan => {
          this.loan = loan;
          const weeklyDue = (loan?.totalAmount && loan?.noOfTerms) ? loan.totalAmount / loan.noOfTerms : 0;
          this.weeklyDue = weeklyDue;
          return this.recoveryPostingService.getSchedulersByLoanId(loanId).pipe(
            map(schedulers => ({ loan, schedulers }))
          );
        })
      ).subscribe({
        next: ({ loan, schedulers }) => {
          this.loan = loan;
          if (!loan) {
            this.loadError = 'Loan not found';
            this.scheduleRows = [];
            return;
          }
          const rows = this.mapSchedulersToScheduleRows(schedulers);
          this.scheduleRows = rows;
          // Total Amount = sum of Paid Amount for rows with Status Paid or Partial/Partially Paid.
          this.totalAmountPaid = (schedulers || []).reduce(
            (sum, s) => {
              const normalizedStatus = String(s.status ?? '').replace(/\s+/g, '').toLowerCase();
              const isPaidOrPartial =
                normalizedStatus === 'paid' ||
                normalizedStatus === 'partial' ||
                normalizedStatus === 'partiallypaid' ||
                normalizedStatus === 'partialpaid';
              return isPaidOrPartial ? sum + (Number(s.paymentAmount) || 0) : sum;
            },
            0
          );
          const total = loan.totalAmount ?? 0;
          this.remainingBalance = Math.max(0, total - this.totalAmountPaid);
          if (loan.totalAmount != null && loan.noOfTerms != null) {
            this.weeklyDue = loan.totalAmount / loan.noOfTerms;
          }
        },
        error: (err) => {
          this.loadError = 'Failed to load repayment summary.';
          console.error(err);
          if (this.loan) {
            this.scheduleRows = [];
            this.weeklyDue = (this.loan.totalAmount && this.loan.noOfTerms) ? this.loan.totalAmount / this.loan.noOfTerms : 0;
            this.totalAmountPaid = 0;
            this.remainingBalance = this.loan.totalAmount ?? 0;
          }
        },
        complete: () => {
          this.isLoading = false;
          loading.dismiss().catch(() => {});
        }
      });
    });
  }

  /** Map GET api/LoanSchedulers/loan/{loanId} response to Week-wise Repayment Schedule rows. */
  private mapSchedulersToScheduleRows(schedulers: LoanSchedulerRecoveryDto[]): RepaymentScheduleRow[] {
    return (schedulers || []).map(s => ({
      weekNo: s.installmentNo ?? 0,
      collectionDate: s.scheduleDate ?? '',
      paidDate: s.paymentDate ?? undefined,
      paymentStatus: s.status ?? 'Not Paid',
      paidAmount: s.paymentAmount != null ? Number(s.paymentAmount) : 0,
      reasons: s.comments ?? undefined
    }));
  }

  /** Parse API date string to local date parts (no timezone shift). Handles ISO and "YYYY-MM-DD HH:mm:ss..." */
  private parseDateOnly(value: string | undefined | null): { y: number; m: number; d: number } | null {
    if (value == null || value === '') return null;
    const s = value.trim();
    const dateOnly = s.includes('T') ? s.split('T')[0] : s.substring(0, 10);
    const parts = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!parts) return null;
    const y = parseInt(parts[1], 10);
    const m = parseInt(parts[2], 10);
    const day = parseInt(parts[3], 10);
    const date = new Date(y, m - 1, day);
    return isNaN(date.getTime()) ? null : { y, m, d: day };
  }

  /** Collection Date format: DDMMYY (e.g. 02/03/26 for 2 Mar 2026). */
  formatDateDDMMYY(value: string | undefined | null): string {
    const p = this.parseDateOnly(value);
    if (!p) return '';
    const dd = String(p.d).padStart(2, '0');
    const mm = String(p.m).padStart(2, '0');
    const yy = String(p.y).slice(-2);
    return `${dd}/${mm}/${yy}`;
  }

  /** Format API date for display (e.g. Paid Date). */
  formatDate(value: string | undefined | null): string {
    const p = this.parseDateOnly(value);
    if (p) return `${String(p.d).padStart(2, '0')}/${String(p.m).padStart(2, '0')}/${String(p.y).slice(-2)}`;
    const d = new Date(value ?? '');
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString();
  }

  formatAmount(value: number | undefined | null): string {
    return value != null ? Number(value).toFixed(2) : '0.00';
  }

  goBack(): void {
    this.router.navigate(['/manage-loan'], { replaceUrl: true });
  }

  onMenuChange(_menu: string): void {}

  onBranchChange(_branch: Branch): void {}
}
