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
  /** From API: principal share of EMI %. Used to auto-calc actual principal from actual paid amount. */
  principalPercentage?: number;
  /** From API: interest share of EMI %. Used to auto-calc actual interest from actual paid amount. */
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
    onCellValueChanged: (event) => this.onGridCellValueChanged(event)
  };

  private gridApi?: GridApi;
  isLoading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private memberService: MemberService,
    private userService: UserService,
    private userContext: UserContextService,
    private recoveryPostingService: RecoveryPostingService
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
    this.loadData();
  }

  ionViewWillEnter(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    const branchId = this.selectedBranch?.id ?? this.getStoredBranchId();
    if (branchId != null) {
      if (!this.selectedBranch) {
        this.selectedBranch = { id: branchId } as Branch;
      }
      this.loadCentersByBranch(Number(branchId));
    } else {
      this.centers = [];
    }
    this.loadUsers();
    this.loadData();
  }

  private loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (list) => {
        const all = (list || []).filter(u => u.id != null);
        const branchId = this.selectedBranch?.id;
        this.users = branchId != null
          ? all.filter(u => Number(u.branchId) === Number(branchId))
          : all;
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
        field: 'paymentAmount',
        headerName: 'Payment Amount',
        width: 140,
        sortable: true,
        filter: false,
        valueFormatter: numberFormatter
      },
      {
        field: 'principalAmount',
        headerName: 'Principal Amount',
        width: 150,
        sortable: true,
        filter: false,
        valueFormatter: numberFormatter
      },
      {
        field: 'interestAmount',
        headerName: 'Interest Amount',
        width: 140,
        sortable: true,
        filter: false,
        valueFormatter: numberFormatter
      },
      {
        field: 'actualEmiAmount',
        headerName: 'Actual Paid Amount',
        width: 140,
        sortable: true,
        filter: false,
        editable: true,
        valueFormatter: numberFormatter,
        valueParser: this.numberValueParser
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
        field: 'paymentMode',
        headerName: 'Payment Mode *',
        width: 140,
        sortable: true,
        filter: false,
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: ['Online', 'Cash'] }
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
        sortable: true,
        filter: false,
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: ['Paid', 'Partial Paid'] }
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

  /** When Actual Paid Amount changes, auto-calculate Actual Principal and Actual Interest from schedule ratio. */
  private onGridCellValueChanged(event: CellValueChangedEvent<RecoveryPostingMemberRow>): void {
    if (!event.data || event.column?.getColId() !== 'actualEmiAmount') return;
    const row = event.data;
    const paid = row.actualEmiAmount;
    const { actualPrincipalAmount, actualInterestAmount } = this.calculatePartialEmiSplit(
      paid,
      row.principalAmount,
      row.paymentAmount,
      row.principalPercentage,
      row.interestPercentage
    );
    row.actualPrincipalAmount = actualPrincipalAmount;
    row.actualInterestAmount = actualInterestAmount;
    event.api.refreshCells({ rowNodes: [event.node], force: true });
  }

  /**
   * Splits actual paid amount into principal and interest using schedule ratio (so full payment matches scheduled).
   * Ensures actualPrincipal + actualInterest = actualPaidAmount exactly (interest = paid - principal).
   */
  private calculatePartialEmiSplit(
    actualPaidAmount: number | null | undefined,
    principalAmount: number | null | undefined,
    paymentAmount: number | null | undefined,
    principalPercentage: number | null | undefined,
    interestPercentage: number | null | undefined
  ): { actualPrincipalAmount: number; actualInterestAmount: number } {
    const paid = actualPaidAmount != null && !Number.isNaN(Number(actualPaidAmount)) ? Number(actualPaidAmount) : 0;
    const principal = principalAmount != null && !Number.isNaN(Number(principalAmount)) ? Number(principalAmount) : 0;
    const payment = paymentAmount != null && paymentAmount > 0 && !Number.isNaN(Number(paymentAmount)) ? Number(paymentAmount) : 0;

    let actualPrincipalAmount: number;
    if (payment > 0) {
      actualPrincipalAmount = Math.round((paid * principal / payment) * 100) / 100;
    } else {
      const pPct = principalPercentage != null && !Number.isNaN(Number(principalPercentage)) ? Number(principalPercentage) : 0;
      actualPrincipalAmount = Math.round((paid * pPct) / 100 * 100) / 100;
    }
    const actualInterestAmount = Math.round((paid - actualPrincipalAmount) * 100) / 100;
    return { actualPrincipalAmount, actualInterestAmount };
  }

  loadData(): void {
    this.isLoading = true;

    if (!this.selectedDate || this.selectedDate.trim() === '') {
      this.rowData = [];
      this.isLoading = false;
      if (this.gridApi) {
        this.gridApi.setGridOption('rowData', this.rowData);
      }
      return;
    }

    const branchId = this.selectedBranch?.id ?? this.getStoredBranchId() ?? null;
    const centerId = this.selectedCenter ? Number(this.selectedCenter) : null;
    const pocId = this.selectedPoc ? Number(this.selectedPoc) : null;

    this.recoveryPostingService
      .getLoanSchedulersForRecovery({
        scheduleDate: this.selectedDate.trim(),
        centerId: centerId && centerId > 0 ? centerId : undefined,
        pocId: pocId && pocId > 0 ? pocId : undefined,
        branchId: branchId ?? undefined,
        pageSize: this.paginationPageSize
      })
      .subscribe({
        next: (items) => {
          this.rowData = (items || []).map((dto) => this.mapDtoToRow(dto));
          this.isLoading = false;
          if (this.gridApi) {
            this.gridApi.setGridOption('rowData', this.rowData);
            setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);
          }
        },
        error: () => {
          this.rowData = [];
          this.isLoading = false;
          if (this.gridApi) {
            this.gridApi.setGridOption('rowData', this.rowData);
          }
          this.showToast('Failed to load recovery posting data. Please try again.', 'danger');
        }
      });
  }

  private mapDtoToRow(dto: LoanSchedulerRecoveryDto): RecoveryPostingMemberRow {
    return {
      loanSchedulerId: dto.loanSchedulerId,
      loanId: dto.loanId,
      installmentNo: dto.installmentNo,
      interestAmount: dto.interestAmount,
      principalAmount: dto.principalAmount,
      parentPocName: dto.parentPocName ?? '',
      centerName: dto.centerName ?? '',
      memberId: dto.memberId != null ? String(dto.memberId) : '',
      memberName: dto.memberName ?? '',
      actualEmiAmount: dto.actualEmiAmount ?? null,
      actualInterestAmount: dto.actualInterestAmount ?? null,
      actualPrincipalAmount: dto.actualPrincipalAmount ?? null,
      comments: dto.comments ?? null,
      paymentAmount: dto.paymentAmount ?? null,
      paymentMode: null,
      status: dto.status === 'Partial' ? 'Partial Paid' : (dto.status ?? null),
      principalPercentage: dto.principalPercentage ?? undefined,
      interestPercentage: dto.interestPercentage ?? undefined
    };
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    if (this.rowData && this.rowData.length > 0) {
      this.gridApi.setGridOption('rowData', this.rowData);
    }
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

    // Collected By is mandatory for Post – must be sent to DB
    const collectedByValue = (this.selectedCollectBy ?? '').toString().trim();
    if (!collectedByValue) {
      await this.showToast('Please select Collected By before posting.', 'warning');
      return;
    }

    // Comment is required only when Status = Partial Paid
    const collectedById = Number(this.selectedCollectBy);
    const invalidRows = selectedRows.filter(row =>
      row.loanSchedulerId == null ||
      row.actualEmiAmount == null ||
      row.actualEmiAmount < 0 ||
      row.actualInterestAmount == null ||
      row.actualInterestAmount < 0 ||
      row.actualPrincipalAmount == null ||
      row.actualPrincipalAmount < 0 ||
      !row.paymentMode ||
      !row.status ||
      (row.status === 'Partial Paid' && (!row.comments || String(row.comments).trim() === ''))
    );

    if (invalidRows.length > 0) {
      const needsComment = selectedRows.some(row =>
        row.status === 'Partial Paid' && (!row.comments || String(row.comments).trim() === '')
      );
      const message = needsComment
        ? 'Comment is required.'
        : 'Please fill all mandatory fields (Payment Mode, Status, Actual amounts, Collected By).';
      await this.showToast(message, 'warning');
      return;
    }

    // If Status is Paid, Actual Paid Amount must match Payment Amount
    const paidAmountMismatch = selectedRows.filter(row => {
      if (row.status !== 'Paid') return false;
      const actual = row.actualEmiAmount ?? 0;
      const scheduled = row.paymentAmount ?? 0;
      return Math.abs(actual - scheduled) > 0.01;
    });
    if (paidAmountMismatch.length > 0) {
      await this.showToast('Amount does not match. For row(s) with Status "Paid", Actual Paid Amount must equal Payment Amount. Change status to "Partial Paid" or correct the amount.', 'warning');
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
      const payload: LoanSchedulerSaveRequest[] = selectedRows.map(row => ({
        loanSchedulerId: row.loanSchedulerId,
        paymentMode: row.paymentMode ?? '',
        status: row.status === 'Partial Paid' ? 'Partial' : (row.status ?? undefined),
        actualEmiAmount: row.actualEmiAmount ?? 0,
        actualInterestAmount: row.actualInterestAmount ?? 0,
        actualPrincipalAmount: row.actualPrincipalAmount ?? 0,
        comments: row.comments ?? '',
        collectedBy: Number.isNaN(collectedByIdNumber) ? undefined : collectedByIdNumber
      }));

      await this.recoveryPostingService.save(payload).toPromise();

      loading.dismiss();
      await this.showToast(`Successfully posted ${selectedRows.length} entry/entries`, 'success');

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

  /** Map API error to user-friendly message; show "Comment is required" for Comments validation. */
  private getPostErrorMessage(err: {
    error?: { message?: string; errors?: Record<string, string[]>; title?: string };
    message?: string;
  }): string {
    const errors = err?.error?.errors;
    if (errors && typeof errors === 'object') {
      const keys = Object.keys(errors);
      if (keys.some(k => /Comments/i.test(k))) {
        return 'Comment is required.';
      }
      const firstKey = keys[0];
      const firstMsg = firstKey && Array.isArray(errors[firstKey]) ? errors[firstKey][0] : null;
      if (firstMsg) return firstMsg;
    }
    return err?.error?.message || err?.message || 'Failed to post entries. Please try again.';
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
        // Do not auto-select: user selects Date → Center → POC → Collect By in order
        this.selectedCenter = '';
        this.pocs = [];
        this.selectedPoc = '';
        this.loadData();
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
