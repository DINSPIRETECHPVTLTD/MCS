import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { UserContextService } from '../../services/user-context.service';
import { LoanService } from '../../services/loan.service';
import { Branch } from '../../models/branch.models';
import { Loan } from '../../models/loan.models';
import { ToastController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-manage-loan',
  templateUrl: './manage-loan.page.html',
  styleUrls: ['./manage-loan.page.scss']
})
export class ManageLoanComponent implements OnInit, ViewWillEnter {
  activeMenu: string = 'Manage Loan';
  loans: Loan[] = [];
  selectedBranch: Branch | null = null;
  isLoading: boolean = false;

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

  private loadLoansByBranch(branchId: number): void {
    this.isLoading = true;
    const loadingPromise = this.loadingController.create({
      message: 'Loading loans...',
      spinner: 'crescent'
    });
    loadingPromise.then(loading => loading.present());

    this.loanService.getLoansByBranch(branchId).subscribe({
      next: (list: Loan[]) => {
        this.loadingController.dismiss();
        this.isLoading = false;
        this.loans = list ?? [];
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
        this.loadingController.dismiss();
        this.isLoading = false;
        this.loans = [];
        console.error('Error loading loans by branch:', err);
        this.toastController.create({
          message: 'Failed to load loans. Please try again.',
          duration: 3000,
          color: 'danger',
          position: 'top'
        }).then(toast => toast.present());
      }
    });
  }
}
