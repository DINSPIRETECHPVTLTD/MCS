import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { MemberService } from '../../services/member.service';
import { UserService } from '../../services/user.service';
import { UserContextService } from '../../services/user-context.service';
import { User } from '../../models/user.models';
import { CellValueChangedEvent, ColDef, GridApi, GridOptions, GridReadyEvent, RowSelectionOptions } from 'ag-grid-community';
import { agGridTheme } from '../../ag-grid-theme';
import { ToastController, LoadingController } from '@ionic/angular';
import { Branch } from '../../models/branch.models';
import { POCOption } from '../../models/member.models';
import {
  LoanSchedulerRecoveryDto,
  LoanSchedulerSaveRequest
} from '../../models/recovery-posting.models';
import { RecoveryPostingService } from '../../services/recovery-posting.service';
import { MasterDataService } from '../../services/master-data.service';
import { LookupKeys } from '../../models/master-data.models';

/** One row per member: POC info + member info, selectable via checkbox */
export interface RecoveryPostingMemberRow {
  loanSchedulerId: number;
  loanId: number;
  parentPocName: string;
  centerName: string;
  installmentNo: number;
  interestAmount: number;
  principalAmount: number;
  memberId: string;
  memberName: string;
  actualEmiAmount?: number | null;
  actualInterestAmount?: number | null;
  actualPrincipalAmount?: number | null;
  comments?: string | null;
  paymentAmount?: number | null;
  paymentMode?: string | null;
  status?: string | null;
  /** From API: principal share of EMI %. Used to auto-calc principal/interest from payment amount. */
  principalPercentage?: number;
  /** From API: interest share of EMI %. Used to auto-calc principal/interest from payment amount. */
  interestPercentage?: number;
}

@Component({
  selector: 'app-recovery-posting',
  templateUrl: './recovery-posting.page.html',
  styleUrls: ['./recovery-posting.page.scss']
})
export class RecoveryPostingComponent implements OnInit, ViewWillEnter {
  activeMenu: string = 'Recovery Posting';
  
  // Filters
  selectedBranch: Branch | null = null;
  selectedCenter: string = '';
  centers: { id: number; name: string; code?: string }[] = [];
  selectedPoc: string = '';
  pocs: POCOption[] = [];
  selectedCollectBy: string = '';
  users: User[] = [];

  /** Payment Mode options from Master Data (LookupKey = PAYMENTMODE); dropdown shows Lookup Value (e.g. Online, Cash). */
  paymentModeValues: string[] = ['Select'];
  statusValues: string[] = ['Paid', 'Partial Paid', 'Not Paid'];

  // Date: ion-input type="date" (same as add loan popup)
  selectedDate: string = '';
  selectedDateDisplay: string = '';
  todayDate: string = '';
  
  // Grid data: one row per member (flattened from POC + members)
  rowData: RecoveryPostingMemberRow[] = [];
  columnDefs: ColDef[] = [];
  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: false
  };
  pagination: boolean = true;
  paginationPageSize: number = 20;
  rowSelection: RowSelectionOptions = { mode: 'multiRow' };
  gridOptions: GridOptions<RecoveryPostingMemberRow> = {
    theme: agGridTheme,
    rowSelection: 'multiple',
    suppressRowClickSelection: true,
    onCellValueChanged: (event) => this.onGridCellValueChanged(event),
    onSelectionChanged: () => this.updateTotalAmountCollected()
  };

  private gridApi?: GridApi;
  isLoading: boolean = false;
  totalAmountCollected: number = 0;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private memberService: MemberService,
    private userService: UserService,
    private userContext: UserContextService,
    private recoveryPostingService: RecoveryPostingService,
    private masterDataService: MasterDataService
  ) {
    const today = new Date();
    this.todayDate = today.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    this.selectedDate = `${y}-${m}-${d}`;
    this.selectedDateDisplay = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.initializeGrid();
    this.loadPaymentModes();
    // Default branch from logged-in user, then stored selection (set in ionViewWillEnter before first load)
    this.applyDefaultBranchAndLoad();
  }

  ionViewWillEnter(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.applyDefaultBranchAndLoad();
  }

  /**
   * Default selection on page load: use logged-in user's Branch (UserContext), then stored branch.
   * Load centers for that branch; if branch has exactly one center, auto-select it (user's assigned center).
   * Filter sequence: Date → Center → POC (results match all applicable conditions).
   */
  private applyDefaultBranchAndLoad(): void {
    const branchId = this.selectedBranch?.id ?? this.userContext.branchId ?? this.getStoredBranchId();
    if (branchId != null) {
      const id = Number(branchId);
      if (!this.selectedBranch || this.selectedBranch.id !== id) {
        this.selectedBranch = { id } as Branch;
        try {
          localStorage.setItem('selected_branch_id', String(id));
        } catch {
          // ignore
        }
      }
      this.loadCentersByBranch(id);
    } else {
      this.centers = [];
      this.selectedCenter = '';
      this.pocs = [];
      this.selectedPoc = '';
      this.loadData();
    }
    this.loadUsers();
  }

  /** Load all users from system/DB for Collected By dropdown. */
  private loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (list) => {
        this.users = (list || []).filter(u => u.id != null);
        const currentUserId = this.userContext.userId;
        if (currentUserId != null) {
          const found = this.users.find(u => u.id === currentUserId);
          if (found) {
            this.selectedCollectBy = String(found.id);
          } else {
            this.selectedCollectBy = '';
          }
        }
      },
      error: () => {
        this.users = [];
      }
    });
  }

  /** Load Payment Mode options from Master Data (LookupKey = PAYMENTMODE) and update grid column. */
  private loadPaymentModes(): void {
    this.masterDataService.getMasterData().subscribe({
      next: (list) => {
        const rawList = list || [];
        const getKey = (l: Record<string, unknown>) =>
          String(l['lookupKey'] ?? l['LookupKey'] ?? '').toUpperCase();
        const filtered = rawList
          .filter(l => getKey(l as unknown as Record<string, unknown>) === LookupKeys.PaymentMode)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        const getValue = (m: Record<string, unknown>) =>
          String(m['lookupValue'] ?? m['LookupValue'] ?? m['lookupCode'] ?? m['LookupCode'] ?? '').trim();
        const values = filtered.map(m => getValue(m as unknown as Record<string, unknown>)).filter(Boolean);
        this.paymentModeValues = ['Select', ...values];
        const paymentModeCol = this.columnDefs.find(c => c.field === 'paymentMode');
        if (paymentModeCol && paymentModeCol.cellEditorParams) {
          (paymentModeCol.cellEditorParams as { values: string[] }).values = this.paymentModeValues;
        }
        if (this.gridApi) {
          this.gridApi.setGridOption('columnDefs', this.columnDefs);
        }
      },
      error: () => {
        this.paymentModeValues = ['Select', 'Online', 'Cash'];
      }
    });
  }

  getUserDisplayName(user: User): string {
    const parts = [user.firstName, user['middleName'], user.lastName].filter(Boolean);
    return parts.join(' ').trim() || 'User';
  }

  initializeGrid(): void {
    const numberFormatter = (params: { value?: number | null }) =>
      params.value != null ? Number(params.value).toFixed(2) : '0.00';
    this.columnDefs = [
      {
        colId: 'select',
        field: '_select',
        headerName: '',
        width: 48,
        minWidth: 48,
        maxWidth: 48,
        suppressSizeToFit: true,
        checkboxSelection: true,
        headerCheckboxSelection: true,
        sortable: false,
        filter: false
      },
      {
        field: 'memberId',
        headerName: 'Member ID',
        width: 120,
        sortable: true,
        filter: false
      },
      {
        field: 'loanId',
        headerName: 'Loan ID',
        width: 130,
        sortable: true,
        filter: false,
        hide: true
      },
      {
        field: 'centerName',
        headerName: 'Center Name',
        minWidth: 140,
        sortable: true,
        filter: false,
        hide: true
      },
      {
        field: 'parentPocName',
        headerName: 'POC Name',
        flex: 1,
        minWidth: 160,
        sortable: true,
        filter: false,
        hide: true
      },
      {
        field: 'memberName',
        headerName: 'Member Name',
        flex: 1,
        minWidth: 180,
        sortable: true,
        filter: false,
        hide: true
      },
      {
        field: 'installmentNo',
        headerName: 'Installment No',
        width: 130,
        sortable: true,
        filter: false
      },
      {
        field: 'actualEmiAmount',
        headerName: 'ActualEmiAmount',
        width: 140,
        sortable: true,
        filter: false,
        editable: false,
        valueFormatter: numberFormatter
      },
      {
        field: 'actualPrincipalAmount',
        headerName: 'Actual Principal Amount',
        width: 170,
        sortable: true,
        filter: false,
        editable: false,
        valueFormatter: numberFormatter
      },
      {
        field: 'actualInterestAmount',
        headerName: 'Actual Interest Amount',
        width: 160,
        sortable: true,
        filter: false,
        editable: false,
        valueFormatter: numberFormatter
      },
      {
        colId: 'paymentAmount',
        field: 'paymentAmount',
        headerName: 'Payment Amount',
        width: 140,
        sortable: true,
        filter: false,
        editable: true,
        valueFormatter: numberFormatter,
        valueParser: this.numberValueParser
      },
      {
        field: 'principalAmount',
        headerName: 'Principal Amount',
        width: 150,
        sortable: true,
        filter: false,
        editable: false,
        valueFormatter: numberFormatter
      },
      {
        field: 'interestAmount',
        headerName: 'Interest Amount',
        width: 140,
        sortable: true,
        filter: false,
        editable: false,
        valueFormatter: numberFormatter
      },
      {
        field: 'paymentMode',
        headerName: 'Payment Mode *',
        width: 140,
        sortable: true,
        filter: false,
        editable: (params) => {
          const row = params.data as RecoveryPostingMemberRow | undefined;
          return this.normalizeStatusValue(row?.status) !== 'Not Paid';
        },
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: this.paymentModeValues?.length ? this.paymentModeValues : ['Select', 'Online', 'Cash'] }
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
        sortable: true,
        filter: false,
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: this.statusValues }
      },
      {
        field: 'comments',
        headerName: 'Comments',
        flex: 1,
        minWidth: 160,
        sortable: true,
        filter: false,
        editable: true
      }
    ];
  }

  /** Parse cell edit value to number for amount columns. */
  private numberValueParser(params: { newValue: unknown }): number | null {
    const v = params.newValue;
    if (v === '' || v === null || v === undefined) return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  }

  /** When Payment Amount changes, auto-calculate Principal and Interest using same ratio as Add Loan / backend EMI. */
  private onGridCellValueChanged(event: CellValueChangedEvent<RecoveryPostingMemberRow>): void {
    if (!event.data) return;
    const colId = event.column?.getColId();
    const row = event.data;

    if (colId === 'status') {
      const status = this.normalizeStatusValue(row.status);
      if (status === 'Not Paid') {
        row.paymentAmount = 0;
        row.principalAmount = 0;
        row.interestAmount = 0;
        row.paymentMode = 'N/A';
        this.updateTotalAmountCollected();
        event.api.refreshCells({ rowNodes: [event.node], columns: ['paymentAmount', 'principalAmount', 'interestAmount', 'paymentMode', 'status'], force: true });
      } else if ((row.paymentMode ?? '').trim().toUpperCase() === 'N/A') {
        row.paymentMode = 'Select';
        event.api.refreshCells({ rowNodes: [event.node], columns: ['paymentMode'], force: true });
      }
      return;
    }

    if (colId !== 'paymentAmount') return;

    const payment = row.paymentAmount != null && !Number.isNaN(Number(row.paymentAmount)) ? Number(row.paymentAmount) : 0;
    if (payment <= 0) {
      row.paymentAmount = 0;
      row.principalAmount = 0;
      row.interestAmount = 0;
      row.status = 'Not Paid';
      row.paymentMode = 'N/A';
      this.updateTotalAmountCollected();
      event.api.refreshCells({ rowNodes: [event.node], columns: ['paymentAmount', 'principalAmount', 'interestAmount', 'paymentMode', 'status'], force: true });
      return;
    }

    const { principalAmount, interestAmount } = this.calculatePaymentSplitFromSchedule(row, payment);
    row.principalAmount = principalAmount;
    row.interestAmount = interestAmount;
    row.status = this.deriveStatusFromAmounts(row);
    this.updateTotalAmountCollected();
    event.api.refreshCells({ rowNodes: [event.node], columns: ['principalAmount', 'interestAmount', 'status'], force: true });
  }

  private updateTotalAmountCollected(): void {
    const selectedRows = this.gridApi?.getSelectedRows() ?? [];
    this.totalAmountCollected = selectedRows.reduce((sum, row) => {
      const amount = row.paymentAmount != null ? Number(row.paymentAmount) : 0;
      return sum + (Number.isNaN(amount) ? 0 : amount);
    }, 0);
  }

  /**
   * Auto-derive UI status from amount comparison:
   * - paymentAmount == actualEmiAmount => Paid
   * - paymentAmount != actualEmiAmount => Partial Paid
   */
  private deriveStatusFromAmounts(row: RecoveryPostingMemberRow): string {
    const payment = row.paymentAmount != null && !Number.isNaN(Number(row.paymentAmount))
      ? Number(row.paymentAmount)
      : 0;
    const actualEmi = row.actualEmiAmount != null && !Number.isNaN(Number(row.actualEmiAmount))
      ? Number(row.actualEmiAmount)
      : 0;
    if (payment <= 0) return 'Not Paid';
    if (actualEmi <= 0) return 'Partial Paid';
    return Math.abs(payment - actualEmi) <= 0.01 ? 'Paid' : 'Partial Paid';
  }

  private normalizeStatusValue(status: string | null | undefined): 'Paid' | 'Partial Paid' | 'Not Paid' {
    const normalized = (status ?? '').toString().trim().toLowerCase();
    if (normalized === 'paid') return 'Paid';
    if (normalized === 'partial' || normalized === 'partial paid' || normalized === 'partialpaid') return 'Partial Paid';
    return 'Not Paid';
  }

  /**
   * Same formula as Add Loan + backend GenerateEmiSchedule:
   * principalPerInstallment = LoanAmount/NoOfTerms, interestPerInstallment = InterestAmount/NoOfTerms,
   * paymentPerInstallment = (LoanAmount+InterestAmount)/NoOfTerms.
   * Ratio = ActualPrincipalAmount/ActualEmiAmount (exact, no percentage rounding). Then:
   * principal = round(payment * ratio, 2), interest = round(payment - principal, 2).
   */
  private calculatePaymentSplitFromSchedule(
    row: RecoveryPostingMemberRow,
    payment: number
  ): { principalAmount: number; interestAmount: number } {
    if (payment <= 0 || Number.isNaN(payment)) {
      return { principalAmount: 0, interestAmount: 0 };
    }
    const total = row.actualEmiAmount != null && row.actualEmiAmount > 0 ? Number(row.actualEmiAmount) : 0;
    const principal = row.actualPrincipalAmount != null ? Number(row.actualPrincipalAmount) : 0;
    if (total > 0) {
      const principalRatio = principal / total;
      const principalAmount = Math.round(payment * principalRatio * 100) / 100;
      const interestAmount = Math.round((payment - principalAmount) * 100) / 100;
      return { principalAmount, interestAmount };
    }
    const pPct = row.principalPercentage != null && !Number.isNaN(Number(row.principalPercentage)) ? Number(row.principalPercentage) : 0;
    const principalAmount = Math.round((payment * pPct) / 100 * 100) / 100;
    const interestAmount = Math.round((payment - principalAmount) * 100) / 100;
    return { principalAmount, interestAmount };
  }

  /**
   * Load recovery grid. Filter sequence: Date → Center → POC.
   * Step 1: Date only → all scheduled EMIs for that date (and branch).
   * Step 2: Date + Center → EMIs for that date and center.
   * Step 3: Date + Center + POC → EMIs for that date, center, and POC.
   * Results match all applicable conditions.
   */
  loadData(): void {
    this.isLoading = true;

    if (!this.selectedDate || this.selectedDate.trim() === '') {
      this.rowData = [];
      this.isLoading = false;
      this.totalAmountCollected = 0;
      if (this.gridApi) {
        this.gridApi.setGridOption('rowData', this.rowData);
      }
      return;
    }

    const branchId = this.selectedBranch?.id ?? this.userContext.branchId ?? this.getStoredBranchId() ?? null;
    const centerId = this.selectedCenter ? Number(this.selectedCenter) : null;
    const pocId = this.selectedPoc ? Number(this.selectedPoc) : null;

    this.recoveryPostingService.getLoanSchedulersForRecovery({
      scheduleDate: this.selectedDate.trim(),
      branchId: branchId ?? undefined,
      centerId: centerId && centerId > 0 ? centerId : undefined,
      pocId: pocId && pocId > 0 ? pocId : undefined,
      pageNumber: 1,
      pageSize: this.paginationPageSize
    }).subscribe({
      next: (items) => {
        // Show only Not Paid schedules in Recovery Posting grid.
        const filteredItems = (items || []).filter(dto => {
          const status = String(dto.status ?? '').replace(/\s+/g, '').toLowerCase();
          return status === 'notpaid';
        });
        this.rowData = filteredItems.map(dto => this.mapDtoToRow(dto));
        this.isLoading = false;
        this.totalAmountCollected = 0;
        if (this.gridApi) {
          this.gridApi.setGridOption('rowData', this.rowData);
          setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);
        }
      },
      error: () => {
        this.rowData = [];
        this.isLoading = false;
        this.totalAmountCollected = 0;
        if (this.gridApi) this.gridApi.setGridOption('rowData', this.rowData);
        this.showToast('Failed to load recovery posting data. Please try again.', 'danger');
      }
    });
  }

  private mapDtoToRow(dto: LoanSchedulerRecoveryDto): RecoveryPostingMemberRow {
    const actualEmiAmount = dto.actualEmiAmount ?? 0;
    const actualPrincipalAmount = dto.actualPrincipalAmount ?? 0;
    const actualInterestAmount = dto.actualInterestAmount ?? 0;
    const row: RecoveryPostingMemberRow = {
      loanSchedulerId: dto.loanSchedulerId,
      loanId: dto.loanId,
      installmentNo: dto.installmentNo,
      interestAmount: actualInterestAmount,
      principalAmount: actualPrincipalAmount,
      parentPocName: dto.parentPocName ?? '',
      centerName: dto.centerName ?? '',
      memberId: dto.memberId != null ? String(dto.memberId) : '',
      memberName: dto.memberName ?? '',
      actualEmiAmount: dto.actualEmiAmount ?? null,
      actualInterestAmount: dto.actualInterestAmount ?? null,
      actualPrincipalAmount: dto.actualPrincipalAmount ?? null,
      comments: dto.comments ?? null,
      paymentAmount: actualEmiAmount,
      paymentMode: 'Select',
      status: null,
      principalPercentage: dto.principalPercentage ?? undefined,
      interestPercentage: dto.interestPercentage ?? undefined
    };

    // Initial UI status should reflect the prefilled amounts on load.
    row.status = this.deriveStatusFromAmounts(row);
    return row;
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    if (this.rowData && this.rowData.length > 0) {
      this.gridApi.setGridOption('rowData', this.rowData);
    }
    this.updateTotalAmountCollected();
    setTimeout(() => {
      this.gridApi?.sizeColumnsToFit();
    }, 100);
  }

  async postSelected(): Promise<void> {
    // Flush any pending cell edit (e.g. Status = Paid) so getSelectedRows() has latest values
    this.gridApi?.stopEditing?.(false);
    const selectedRows = this.gridApi?.getSelectedRows();
    if (!selectedRows || selectedRows.length === 0) {
      await this.showToast('Please select at least one row to post', 'warning');
      return;
    }

    // Collected By is mandatory – show dedicated message if not selected
    const collectedByValue = (this.selectedCollectBy ?? '').toString().trim();
    if (!collectedByValue) {
      await this.showToast('Cannot post. Please select Collected By.', 'warning');
      return;
    }

    // Mandatory fields for posting.
    const missingInRows = new Set<string>();
    for (const row of selectedRows) {
      if (row.loanSchedulerId == null) continue;
      const status = this.normalizeStatusValue(row.status);
      if (row.paymentAmount == null || row.paymentAmount < 0 || Number.isNaN(Number(row.paymentAmount)))
        missingInRows.add('Payment Amount');
      if (row.principalAmount == null || row.principalAmount < 0 || Number.isNaN(Number(row.principalAmount)))
        missingInRows.add('Principal Amount');
      if (row.interestAmount == null || row.interestAmount < 0 || Number.isNaN(Number(row.interestAmount)))
        missingInRows.add('Interest Amount');
      if (status !== 'Not Paid' && (!row.paymentMode || row.paymentMode === 'Select')) missingInRows.add('Payment Mode');
      if (!row.status || String(row.status).trim() === '') missingInRows.add('Status');
      if (status === 'Not Paid' && (!row.comments || String(row.comments).trim() === '')) {
        missingInRows.add('Comments (mandatory for Not Paid)');
      }
    }

    if (missingInRows.size > 0) {
      const message = 'Cannot post. Please fill or select: ' + Array.from(missingInRows).join(', ') + '.';
      await this.showToast(message, 'warning');
      return;
    }

    // Sanity: principal + interest should equal payment (within rounding)
    const sumMismatch = selectedRows.filter(row => {
      if (this.normalizeStatusValue(row.status) === 'Not Paid') return false;
      const payment = row.paymentAmount ?? 0;
      const sum = (row.principalAmount ?? 0) + (row.interestAmount ?? 0);
      return Math.abs(payment - sum) > 0.02;
    });
    if (sumMismatch.length > 0) {
      await this.showToast('Principal + Interest must equal Payment Amount for selected row(s).', 'warning');
      return;
    }

    // Payment Amount cannot exceed Actual EMI Amount.
    const exceedsScheduled = selectedRows.filter(row => {
      const payment = row.paymentAmount ?? 0;
      const actualEmi = row.actualEmiAmount ?? 0;
      return payment > actualEmi;
    });
    if (exceedsScheduled.length > 0) {
      await this.showToast('Payment amount cannot exceed scheduled amount.', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Posting selected entries...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const collectedByIdNumber = Number(this.selectedCollectBy);
      if (Number.isNaN(collectedByIdNumber)) {
        loading.dismiss();
        await this.showToast('Collected By must be a valid user. Please select from the list.', 'danger');
        return;
      }
      // Post to DB: PaymentAmount, PrincipalAmount, InterestAmount (Actual* columns are not updated on post)
      const payload: LoanSchedulerSaveRequest[] = selectedRows.map(row => {
        const selectedStatus = this.normalizeStatusValue(row.status);
        const isNotPaid = selectedStatus === 'Not Paid';
        return ({
        loanSchedulerId: row.loanSchedulerId,
        // Backend expects lookup VALUE (e.g. Cash / Online), not the code.
        paymentMode: isNotPaid ? 'N/A' : ((row.paymentMode === 'Select' || !row.paymentMode) ? '' : row.paymentMode),
        status: selectedStatus === 'Paid' ? 'Paid' : (selectedStatus === 'Not Paid' ? 'Not Paid' : 'Partial'),
        paymentAmount: isNotPaid ? 0 : (row.paymentAmount ?? 0),
        principalAmount: isNotPaid ? 0 : (row.principalAmount ?? 0),
        interestAmount: isNotPaid ? 0 : (row.interestAmount ?? 0),
        comments: row.comments ?? '',
        collectedBy: Number.isNaN(collectedByIdNumber) ? undefined : collectedByIdNumber
      });
      });

      await this.recoveryPostingService.save(payload).toPromise();

      loading.dismiss();
      await this.showToast('Successful EMI Paid', 'success');

      // Reload data
      this.loadData();
    } catch (error: unknown) {
      loading.dismiss();
      const err = error as {
        error?: {
          message?: string;
          errors?: Record<string, string[]>;
          title?: string;
        };
        message?: string;
      };
      const errorMessage = this.getPostErrorMessage(err);
      await this.showToast(errorMessage, 'danger');
    }
  }

  /** Map API error to user-friendly message. */
  private getPostErrorMessage(err: {
    error?: { message?: string; errors?: Record<string, string[]>; title?: string } | string;
    message?: string;
  }): string {
    // Backend may return plain string for BadRequest("...").
    if (typeof err?.error === 'string' && err.error.trim() !== '') {
      return err.error;
    }

    const errorObj = (err?.error && typeof err.error === 'object') ? err.error : undefined;
    const errors = errorObj?.errors;
    if (errors && typeof errors === 'object') {
      const keys = Object.keys(errors);
      const firstKey = keys[0];
      const firstMsg = firstKey && Array.isArray(errors[firstKey]) ? errors[firstKey][0] : null;
      if (firstMsg) return firstMsg;
    }
    return errorObj?.message || err?.message || 'Failed to post entries. Please try again.';
  }

  close(): void {
    // TODO: Implement close functionality
    this.router.navigate(['/home']);
  }

  onDateChange(): void {
    if (this.selectedDate) {
      const d = new Date(this.selectedDate);
      this.selectedDateDisplay = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    this.loadData();
  }

  onCenterChange(): void {
    this.selectedPoc = '';
    this.loadPocsForCenter();
  }

  onPocChange(): void {
    this.loadData();
  }

  onCollectByChange(): void {
    // Not connected to grid filter for now; value available for POST when needed
  }

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

  onBranchChange(branch: Branch): void {
    this.selectedBranch = branch;
    this.selectedCenter = '';
    this.selectedCollectBy = '';
    this.loadCentersByBranch(branch.id);
    this.loadUsers();
  }

  private getStoredBranchId(): number | null {
    try {
      const id = localStorage.getItem('selected_branch_id');
      return id != null && id !== '' ? Number(id) : null;
    } catch {
      return null;
    }
  }

  private loadCentersByBranch(branchId: number): void {
    this.memberService.getCentersByBranch(branchId).subscribe({
      next: (list) => {
        this.centers = (list || []).map(c => ({
          id: c.id,
          name: c.name || '',
          code: (c as { code?: string }).code
        }));
        this.pocs = [];
        this.selectedPoc = '';
        // On page open: default select first center so grid loads with date + first center filter
        if (this.centers.length > 0) {
          this.selectedCenter = String(this.centers[0].id);
          this.loadPocsForCenter();
        } else {
          this.selectedCenter = '';
          this.loadData();
        }
      },
      error: () => {
        this.centers = [];
        this.selectedCenter = '';
        this.pocs = [];
        this.selectedPoc = '';
        this.loadData();
      }
    });
  }

  private loadPocsForCenter(): void {
    const centerId = this.selectedCenter ? Number(this.selectedCenter) : null;
    if (centerId == null || centerId === 0) {
      this.pocs = [];
      this.selectedPoc = '';
      this.loadData();
      return;
    }
    // Same as Add Member: fetch all POCs and filter by selected center
    this.memberService.getAllPOCs().subscribe({
      next: (pocsList) => {
        this.pocs = (pocsList || [])
          .filter(poc => Number(poc.centerId) === centerId)
          .map(poc => ({
            ...poc,
            name: (poc.name || [poc.firstName, poc.middleName, poc.lastName].filter(Boolean).join(' ')).trim()
          }));
        this.selectedPoc = '';
        this.loadData();
      },
      error: () => {
        this.pocs = [];
        this.selectedPoc = '';
        this.loadData();
      }
    });
  }

  getPocDisplayName(poc: POCOption): string {
    if (poc.name) return poc.name;
    const parts = [poc.firstName, poc.middleName, poc.lastName].filter(Boolean);
    return parts.join(' ').trim() || `POC ${poc.id}`;
  }

  /** Show toast message (same pattern as other pages: duration 3000, position top). */
  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
