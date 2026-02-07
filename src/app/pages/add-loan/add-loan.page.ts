import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { MemberService } from '../../services/member.service';
import { Member } from '../../models/member.models';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { agGridTheme } from '../../ag-grid-theme';
import { ToastController, LoadingController } from '@ionic/angular';
import { Branch } from '../../models/branch.models';
import { Loan, CreateLoanRequest } from '../../models/loan.models';
import { LoanService } from '../../services/loan.service';

@Component({
  selector: 'app-add-loan',
  templateUrl: './add-loan.page.html',
  styleUrls: ['./add-loan.page.scss']
})
export class AddLoanComponent implements OnInit, ViewWillEnter {
  activeMenu: string = 'Add Loan';
  
  // Step management
  step1Expanded: boolean = true;
  step2Expanded: boolean = false;
  
  // Member search (first name, last name, member ID)
  searchFirstName: string = '';
  searchLastName: string = '';
  searchMemberId: string = '';
  searchResults: Member[] = [];
  selectedMember: Member | null = null;
  isSearching: boolean = false;
  /** When true, grid is visible; after selecting a member, grid is hidden and details shown */
  showMemberGrid: boolean = false;

  // Loan details form (Step 2)
  loanId: number | null = null; // set after save; null when adding
  isCreatingLoan: boolean = false;
  /** Set after successful create; shows loan detail view with loan + member details */
  createdLoan: Loan | null = null;
  loanForm: CreateLoanRequest = {
    loanCode: '',
    memberId: 0,
    loanAmount: 0,
    interestAmount: 0,
    processingFee: 0,
    insuranceFee: 0,
    isSavingEnabled: false,
    savingAmount: 0
  };
  
  // AG Grid configuration
  rowData: Member[] = [];
  columnDefs: ColDef[] = [
    {
      headerName: 'Member ID',
      valueGetter: (params) => {
        const data = params.data as Member;
        return (data as Member)?.memberId ?? (data as Member)?.id ?? '';
      },
      width: 120,
      sortable: true,
      filter: true
    },
    {
      headerName: 'First Name',
      valueGetter: (params) => (params.data as Member)?.firstName ?? '',
      width: 130,
      sortable: true,
      filter: true
    },
    {
      headerName: 'Last Name',
      valueGetter: (params) => (params.data as Member)?.lastName ?? '',
      width: 130,
      sortable: true,
      filter: true
    },
    {
      field: 'age',
      headerName: 'Age',
      width: 80,
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
  paginationPageSize: number = 10;

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
    private loanService: LoanService,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private cdr: ChangeDetectorRef
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
  }

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

  onBranchChange(_branch: Branch): void {
    // Handle branch change if needed
  }

  toggleStep(step: number): void {
    if (step === 1) {
      this.step1Expanded = !this.step1Expanded;
    } else if (step === 2) {
      this.step2Expanded = !this.step2Expanded;
    }
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

    this.memberService.searchMembersByCriteria({
      firstName: first || undefined,
      lastName: last || undefined,
      memberId: id || undefined
    }).subscribe({
      next: (members: Member[]) => {
        this.searchResults = members;
        this.rowData = members;
        this.showMemberGrid = true;
        this.selectedMember = null;
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
          setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);
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

  /** Called when user clicks Select on a row; hides grid and shows member details */
  selectMemberFromGrid(member: Member): void {
    this.selectedMember = member;
    this.showMemberGrid = false;
    this.step1Expanded = false;
    this.step2Expanded = true;
    this.setLoanMemberId();
    this.cdr.detectChanges(); // run change detection (click came from AG Grid outside Angular zone)
  }

  /** Sync loan form MemberId from selected member */
  private setLoanMemberId(): void {
    if (this.selectedMember) {
      const id = this.selectedMember.memberId ?? this.selectedMember.id;
      this.loanForm.memberId = id != null ? Number(id) : 0;
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

  /** Clear selected member and show grid again */
  clearSelectedMember(): void {
    this.selectedMember = null;
    this.showMemberGrid = this.rowData.length > 0;
    this.loanForm.memberId = 0;
  }

  isLoanFormValid(): boolean {
    const f = this.loanForm;
    return !!(
      (f.loanCode ?? '').trim() &&
      f.memberId > 0 &&
      (f.loanAmount ?? 0) >= 0
    );
  }

  createLoan(): void {
    if (!this.isLoanFormValid() || this.isCreatingLoan) return;
    this.isCreatingLoan = true;
    const loadingPromise = this.loadingController.create({
      message: 'Creating loan...',
      spinner: 'crescent'
    });
    loadingPromise.then(loading => loading.present());

    this.loanService.createLoan(this.loanForm).subscribe({
      next: (loan: Loan) => {
        this.loadingController.dismiss();
        this.isCreatingLoan = false;
        this.createdLoan = { ...loan };
        this.loanId = loan.loanId ?? null;
        this.cdr.detectChanges();
        this.toastController.create({
          message: 'Loan created successfully',
          duration: 2000,
          color: 'success',
          position: 'top'
        }).then(toast => toast.present());
      },
      error: (err: unknown) => {
        this.loadingController.dismiss();
        this.isCreatingLoan = false;
        this.cdr.detectChanges();
        console.error('Create loan error:', err);
        this.toastController.create({
          message: 'Failed to create loan. Please try again.',
          duration: 3000,
          color: 'danger',
          position: 'top'
        }).then(toast => toast.present());
      }
    });
  }

  /** Return to add-loan flow from loan detail view */
  goBackToAddLoan(): void {
    this.createdLoan = null;
    this.loanId = null;
    this.selectedMember = null;
    this.showMemberGrid = false;
    this.rowData = [];
    this.loanForm = {
      loanCode: '',
      memberId: 0,
      loanAmount: 0,
      interestAmount: 0,
      processingFee: 0,
      insuranceFee: 0,
      isSavingEnabled: false,
      savingAmount: 0
    };
    this.step1Expanded = true;
    this.step2Expanded = false;
    this.cdr.detectChanges();
  }
}
