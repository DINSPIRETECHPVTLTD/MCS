import { Component, OnInit } from '@angular/core';
import { NgZone } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { Branch } from '../../models/branch.models';
import { LoanService } from '../../services/loan.service';
import { RecoveryPostingService } from '../../services/recovery-posting.service';
import { UserContextService } from '../../services/user-context.service';
import { UserService } from '../../services/user.service';
import { MasterDataService } from '../../services/master-data.service';
import { ToastController, LoadingController } from '@ionic/angular';
import { map, switchMap } from 'rxjs/operators';
import { Loan } from '../../models/loan.models';
import { firstValueFrom } from 'rxjs';
import {
  LoanSchedulerRecoveryDto,
  LoanSchedulerSaveRequest
} from '../../models/recovery-posting.models';
import { LookupKeys } from '../../models/master-data.models';
import { User } from '../../models/user.models';
import {
  ColDef,
  GridApi,
  GridOptions,
  GridReadyEvent
} from 'ag-grid-community';
import { agGridTheme } from '../../ag-grid-theme';

/** One row in the Prepayment EMI table. */
export interface PrepaymentEmiRow {
  selected: boolean;
  loanSchedulerId: number;
  weekNo: number;
  collectionDate: string;
  paidDate: string | null;
  paymentStatus: string;
  paidAmount: number;
  weeklyDue: number;
  paymentMode: string;
  collectedBy: number | null;
  reasons: string;
  actualEmiAmount?: number | null;
  actualPrincipalAmount?: number | null;
  actualInterestAmount?: number | null;
  principalPercentage?: number | null;
  interestPercentage?: number | null;
}

@Component({
  selector: 'app-preclose-loan',
  templateUrl: './preclose-loan.page.html',
  styleUrls: ['./preclose-loan.page.scss']
})
export class PrecloseLoanComponent implements OnInit, ViewWillEnter {
  activeMenu = 'Manage Loan';

  loanId: number | null = null;
  memberName: string = '';
  loan: Loan | null = null;
  emiRows: PrepaymentEmiRow[] = [];
  totalAmountPaid = 0;
  remainingBalance = 0;
  isLoading = false;
  isSaving = false;
  loadError: string | null = null;

  paymentModeValues: string[] = ['Select'];
  users: User[] = [];
  emiColumnDefs: ColDef[] = [];
  emiDefaultColDef: ColDef = { sortable: true, filter: false, resizable: true };
  emiGridOptions: GridOptions<PrepaymentEmiRow> = {
    theme: agGridTheme,
    rowSelection: 'multiple',
    suppressRowClickSelection: true,
    suppressMovableColumns: true,
    rowClassRules: {
      'readonly-row': (params) => !this.isNotPaid(params.data)
    },
    onSelectionChanged: () => this.onGridSelectionChanged(),
    onCellValueChanged: () => this.onGridCellValueChanged()
  };
  emiPagination = true;
  emiPaginationPageSize = 20;
  emiPaginationPageSizeSelector: number[] = [10, 20, 50, 100];
  private emiGridApi?: GridApi<PrepaymentEmiRow>;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private loanService: LoanService,
    private recoveryPostingService: RecoveryPostingService,
    private userContext: UserContextService,
    private userService: UserService,
    private masterDataService: MasterDataService,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.initializeGrid();
    this.loadPaymentModes();
    this.loadUsers();
    const loanIdParam = this.route.snapshot.queryParamMap.get('loanId');
    this.memberName = this.route.snapshot.queryParamMap.get('memberName') ?? '';
    if (loanIdParam) {
      const id = parseInt(loanIdParam, 10);
      if (!isNaN(id)) {
        this.loanId = id;
        this.loadData();
        return;
      }
    }
    this.loanId = null;
    this.loadError = null;
  }

  ionViewWillEnter(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    const loanIdParam = this.route.snapshot.queryParamMap.get('loanId');
    this.memberName = this.route.snapshot.queryParamMap.get('memberName') ?? '';
    if (loanIdParam) {
      const id = parseInt(loanIdParam, 10);
      if (!isNaN(id) && this.loanId === id) {
        return;
      }
      if (!isNaN(id)) {
        this.loanId = id;
        this.loadData();
        return;
      }
    }
    this.loanId = null;
    this.loadError = null;
  }

  private loadData(): void {
    if (this.loanId == null) return;
    this.isLoading = true;
    this.loadError = null;
    const loanId = this.loanId;
    this.loadingController
      .create({ message: 'Loading prepayment data...', spinner: 'crescent' })
      .then((loading) => {
        loading.present();
        this.loanService
          .getLoanById(loanId)
          .pipe(
            switchMap((loan) => {
              this.loan = loan;
              return this.recoveryPostingService
                .getSchedulersByLoanId(loanId)
                .pipe(map((schedulers) => ({ loan, schedulers })));
            })
          )
          .subscribe({
            next: ({ loan, schedulers }) => {
              this.loan = loan;
              if (!loan) {
                this.loadError = 'Loan not found';
                this.emiRows = [];
                return;
              }
              this.emiRows = this.mapSchedulersToEmiRows(schedulers);
              if (this.emiGridApi) {
                this.emiGridApi.setGridOption('rowData', this.emiRows);
              }
              // Total Amount (Paid) = sum of PaymentAmount for rows with Status Paid or Partial/Partially Paid.
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
            },
            error: (err) => {
              this.loadError = 'Failed to load prepayment data.';
              console.error(err);
              this.emiRows = [];
              if (this.emiGridApi) {
                this.emiGridApi.setGridOption('rowData', this.emiRows);
              }
              if (this.loan) {
                this.totalAmountPaid = 0;
                this.remainingBalance = this.loan.totalAmount ?? 0;
              }
              this.isLoading = false;
              loading.dismiss().catch(() => {});
            },
            complete: () => {
              this.isLoading = false;
              loading.dismiss().catch(() => {});
            }
          });
      });
  }

  private mapSchedulersToEmiRows(
    schedulers: LoanSchedulerRecoveryDto[]
  ): PrepaymentEmiRow[] {
    const statusMap = (s: string): string => {
      if (s === 'Partial') return 'Partially Paid';
      if (s === 'Paid') return 'Paid';
      return 'Not Paid';
    };
    const weeklyDue =
      this.loan?.totalAmount != null && this.loan?.noOfTerms != null
        ? this.loan.totalAmount / this.loan.noOfTerms
        : 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (schedulers || []).map((s) => {
      const status = statusMap(s.status ?? '');
      const collectionDate = s.scheduleDate ?? '';
      const collectionParsed = this.parseDateOnly(collectionDate);
      const isPastDue =
        collectionParsed != null
          ? new Date(
              collectionParsed.y,
              collectionParsed.m - 1,
              collectionParsed.d
            ) <= today
          : false;
      let reasons = (s.comments ?? '').trim();
      if (status === 'Not Paid' && isPastDue && !reasons) {
        reasons = 'Not Paid';
      }
      return {
        selected: false,
        loanSchedulerId: s.loanSchedulerId,
        weekNo: s.installmentNo ?? 0,
        collectionDate,
        paidDate: s.paymentDate ?? null,
        paymentStatus: status,
        paidAmount: s.paymentAmount != null ? Number(s.paymentAmount) : 0,
        // EMI (Weekly Due) is fixed per loan: totalAmount / noOfTerms.
        // Do not rely on API actualEmiAmount here, since it may be null for unpaid rows.
        weeklyDue,
        paymentMode: 'Select',
        collectedBy: this.userContext.userId ?? null,
        reasons,
        actualEmiAmount: s.actualEmiAmount ?? null,
        actualPrincipalAmount: s.actualPrincipalAmount ?? null,
        actualInterestAmount: s.actualInterestAmount ?? null,
        principalPercentage: s.principalPercentage ?? null,
        interestPercentage: s.interestPercentage ?? null
      };
    });
  }

  private parseDateOnly(
    value: string | undefined | null
  ): { y: number; m: number; d: number } | null {
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

  formatDateDDMMYY(value: string | undefined | null): string {
    const p = this.parseDateOnly(value);
    if (!p) return '';
    const dd = String(p.d).padStart(2, '0');
    const mm = String(p.m).padStart(2, '0');
    const yy = String(p.y).slice(-2);
    return `${dd}/${mm}/${yy}`;
  }

  formatDate(value: string | undefined | null): string {
    const p = this.parseDateOnly(value);
    if (p)
      return `${String(p.d).padStart(2, '0')}/${String(p.m).padStart(2, '0')}/${String(p.y).slice(-2)}`;
    const d = new Date(value ?? '');
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString();
  }

  formatAmount(value: number | undefined | null): string {
    return value != null ? Number(value).toFixed(2) : '0.00';
  }

  isNotPaid(row: PrepaymentEmiRow | null | undefined): boolean {
    return !!row && row.paymentStatus === 'Not Paid';
  }

  private getSelectedNotPaidRows(): PrepaymentEmiRow[] {
    if (this.emiGridApi) {
      return this.emiGridApi
        .getSelectedRows()
        .filter((row) => this.isNotPaid(row));
    }
    return this.emiRows.filter((r) => r.selected && this.isNotPaid(r));
  }

  get canSave(): boolean {
    const selected = this.getSelectedNotPaidRows();
    if (selected.length === 0) return false;
    for (const r of selected) {
      if (!r.paymentMode || r.paymentMode === 'Select') return false;
      if (r.collectedBy == null) return false;
      if (!r.reasons || String(r.reasons).trim() === '') return false;
    }
    return true;
  }

  getUserIdDisplayName(userId: number | null): string {
    if (userId == null) return '';
    const u = this.users.find((x) => x.id === userId);
    if (!u) return String(userId);
    const parts = [u.firstName, (u as { middleName?: string }).middleName, u.lastName].filter(Boolean);
    return parts.join(' ').trim() || 'User';
  }

  private loadPaymentModes(): void {
    this.masterDataService.getMasterData().subscribe({
      next: (list) => {
        const rawList = list || [];
        const getKey = (l: Record<string, unknown>) =>
          String(l['lookupKey'] ?? l['LookupKey'] ?? '').toUpperCase();
        const filtered = rawList
          .filter(
            (l) =>
              getKey(l as unknown as Record<string, unknown>) ===
              LookupKeys.PaymentMode
          )
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        const getValue = (m: Record<string, unknown>) =>
          String(
            m['lookupValue'] ??
              m['LookupValue'] ??
              m['lookupCode'] ??
              m['LookupCode'] ??
              ''
          ).trim();
        const values = filtered
          .map((m) => getValue(m as unknown as Record<string, unknown>))
          .filter(Boolean);
        this.paymentModeValues = ['Select', ...values];
        this.emiGridApi?.refreshCells({
          columns: ['paymentMode'],
          force: true
        });
      },
      error: () => {
        this.paymentModeValues = ['Select', 'Online', 'Cash'];
        this.emiGridApi?.refreshCells({
          columns: ['paymentMode'],
          force: true
        });
      }
    });
  }

  private loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (list) => {
        this.users = (list || []).filter((u) => u.id != null);
        const currentUserId = this.userContext.userId;
        this.emiRows.forEach((row) => {
          if (row.collectedBy == null && currentUserId != null) {
            row.collectedBy = currentUserId;
          }
        });
        this.emiGridApi?.refreshCells({
          columns: ['collectedBy'],
          force: true
        });
      },
      error: () => {
        this.users = [];
      }
    });
  }

  private calculatePrincipalInterest(
    row: PrepaymentEmiRow,
    payment: number
  ): { principalAmount: number; interestAmount: number } {
    if (payment <= 0 || Number.isNaN(payment)) {
      return { principalAmount: 0, interestAmount: 0 };
    }
    const total =
      row.actualEmiAmount != null && row.actualEmiAmount > 0
        ? Number(row.actualEmiAmount)
        : 0;
    const principal =
      row.actualPrincipalAmount != null ? Number(row.actualPrincipalAmount) : 0;
    if (total > 0) {
      const principalRatio = principal / total;
      const principalAmount =
        Math.round(payment * principalRatio * 100) / 100;
      const interestAmount =
        Math.round((payment - principalAmount) * 100) / 100;
      return { principalAmount, interestAmount };
    }
    const pPct =
      row.principalPercentage != null &&
      !Number.isNaN(Number(row.principalPercentage))
        ? Number(row.principalPercentage)
        : 0;
    const principalAmount = Math.round((payment * pPct) / 100 * 100) / 100;
    const interestAmount =
      Math.round((payment - principalAmount) * 100) / 100;
    return { principalAmount, interestAmount };
  }

  async save(): Promise<void> {
    if (this.isSaving) return;
    this.isSaving = true;
    this.emiGridApi?.stopEditing();
    const selected = this.getSelectedNotPaidRows();
    if (selected.length === 0) {
      await this.showToast('Select at least one row to pay.', 'warning');
      return;
    }
    for (const r of selected) {
      if (!r.paymentMode || r.paymentMode === 'Select') {
        await this.showToast('Please select Payment Mode for all selected rows.', 'warning');
        return;
      }
      if (r.collectedBy == null) {
        await this.showToast('Please select Collected By for all selected rows.', 'warning');
        return;
      }
      if (!r.reasons || String(r.reasons).trim() === '') {
        await this.showToast('Please enter Reasons for all selected rows.', 'warning');
        return;
      }
      // P0 hardening: outstanding must come from server schedule (ActualEmiAmount).
      const scheduled = r.actualEmiAmount != null ? Number(r.actualEmiAmount) : NaN;
      if (Number.isNaN(scheduled) || scheduled <= 0) {
        await this.showToast('Scheduled outstanding amount is invalid. Cannot post payment.', 'warning');
        return;
      }
    }

    const payment =
      await this.loadingController.create({
        message: 'Saving prepayment...',
        spinner: 'crescent'
      });
    await payment.present();

    try {
      const payload: LoanSchedulerSaveRequest[] = selected.map((row) => {
        const paymentAmountRaw = row.actualEmiAmount != null ? Number(row.actualEmiAmount) : 0;
        const paymentAmount = Math.round(paymentAmountRaw * 100) / 100;
        if (paymentAmount <= 0) {
          throw new Error('Payment amount must be greater than 0.');
        }
        const { principalAmount, interestAmount } =
          this.calculatePrincipalInterest(row, paymentAmount);
        return {
          loanSchedulerId: row.loanSchedulerId,
          status: 'Paid',
          // Keep consistent with Recovery Posting and backend expectations: send lookup VALUE (e.g. Cash / Online).
          paymentMode: String(row.paymentMode ?? '').trim(),
          paymentAmount,
          principalAmount,
          interestAmount,
          comments: String(row.reasons ?? '').trim(),
          collectedBy: row.collectedBy ?? undefined
        };
      });
      await firstValueFrom(this.recoveryPostingService.save(payload));
      await this.showToast('Prepayment saved successfully.', 'success');
      this.loadData();
    } catch (err: unknown) {
      const e = err as { error?: { message?: string }; message?: string };
      await this.showToast(
        e?.error?.message ?? e?.message ?? 'Failed to save prepayment.',
        'danger'
      );
    } finally {
      await payment.dismiss().catch(() => {});
      this.isSaving = false;
    }
  }

  cancel(): void {
    this.router.navigate(['/manage-loan'], { replaceUrl: true });
  }

  goBackToManageLoan(): void {
    this.router.navigate(['/manage-loan'], { replaceUrl: true });
  }

  private async showToast(
    message: string,
    color: 'success' | 'danger' | 'warning' = 'success'
  ): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

  onBranchChange(_branch: Branch): void {}

  private initializeGrid(): void {
    this.emiColumnDefs = [
      {
        headerName: 'Select',
        width: 90,
        minWidth: 90,
        maxWidth: 90,
        sortable: false,
        filter: false,
        resizable: false,
        checkboxSelection: (params) => this.isNotPaid(params.data),
        headerCheckboxSelection: false
      },
      { headerName: 'Week No', field: 'weekNo', width: 100 },
      {
        headerName: 'Collection Date',
        field: 'collectionDate',
        width: 150,
        valueFormatter: (params) => this.formatDateDDMMYY(params.value)
      },
      {
        headerName: 'Paid Date',
        field: 'paidDate',
        width: 130,
        valueFormatter: (params) => this.formatDate(params.value)
      },
      { headerName: 'Payment Status', field: 'paymentStatus', width: 150 },
      {
        headerName: 'Paid Amount',
        field: 'paidAmount',
        width: 130,
        valueFormatter: (params) => this.formatAmount(params.value)
      },
      {
        headerName: 'Weekly Due (EMI)',
        field: 'weeklyDue',
        width: 150,
        valueFormatter: (params) => this.formatAmount(params.value)
      },
      {
        headerName: 'Payment Mode',
        field: 'paymentMode',
        width: 160,
        editable: (params) => this.isNotPaid(params.data),
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: () => ({ values: this.paymentModeValues })
      },
      {
        headerName: 'Collected By',
        field: 'collectedBy',
        width: 190,
        editable: (params) => this.isNotPaid(params.data),
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: () => ({ values: this.getCollectedByOptionValues() }),
        valueParser: (params) => {
          if (params.newValue == null || params.newValue === '') return null;
          const id = Number(params.newValue);
          return Number.isNaN(id) ? null : id;
        },
        valueFormatter: (params) =>
          this.getUserIdDisplayName(params.value != null ? Number(params.value) : null) || '–'
      },
      {
        headerName: 'Reasons',
        field: 'reasons',
        minWidth: 220,
        flex: 1,
        editable: (params) => this.isNotPaid(params.data),
        valueFormatter: (params) => params.value || '–'
      }
    ];
  }

  onEmiGridReady(event: GridReadyEvent<PrepaymentEmiRow>): void {
    this.emiGridApi = event.api;
    this.emiGridApi.setGridOption('rowData', this.emiRows);
    setTimeout(() => this.emiGridApi?.sizeColumnsToFit(), 100);
  }

  private onGridSelectionChanged(): void {
    const selectedIds = new Set(
      (this.emiGridApi?.getSelectedRows() || []).map((row) => row.loanSchedulerId)
    );
    this.emiRows.forEach((row) => {
      row.selected = selectedIds.has(row.loanSchedulerId);
    });
    this.ngZone.run(() => {});
  }

  private onGridCellValueChanged(): void {
    this.ngZone.run(() => {});
  }

  private getCollectedByOptionValues(): string[] {
    return this.users
      .map((u) => (u.id != null ? String(u.id) : ''))
      .filter((id) => id !== '');
  }
}
