import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { LoanService } from '../../services/loan.service';
import { MemberService } from '../../services/member.service';
import { Loan } from '../../models/loan.models';
import { Member } from '../../models/member.models';
import { ToastController, LoadingController } from '@ionic/angular';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-loan-detail',
  templateUrl: './loan-detail.page.html',
  styleUrls: ['./loan-detail.page.scss']
})
export class LoanDetailComponent implements OnInit, ViewWillEnter {
  activeMenu = 'Manage Loan';
  loan: Loan | null = null;
  member: Member | null = null;
  isLoading = true;
  loadError: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private loanService: LoanService,
    private memberService: MemberService,
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
    this.loadLoanDetail();
  }

  private loadLoanDetail(): void {
    const loanId = this.route.snapshot.paramMap.get('loanId');
    const id = loanId ? Number(loanId) : NaN;
    if (!loanId || Number.isNaN(id)) {
      this.loadError = 'Invalid loan ID';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.loadError = null;
    this.loan = null;
    this.member = null;

    this.loadingController.create({ message: 'Loading loan details...', spinner: 'crescent' })
      .then(loading => loading.present());

    this.loanService.getLoanById(id).pipe(
      switchMap(loan => {
        this.loan = loan;
        const memberId = loan?.memberId;
        if (memberId != null && memberId > 0) {
          return this.memberService.getMemberById(memberId);
        }
        return of(null);
      })
    ).subscribe({
      next: (m: Member | null) => {
        this.member = m ?? null;
        this.loadingController.dismiss().catch(() => {});
        this.isLoading = false;
      },
      error: (err: unknown) => {
        this.loadingController.dismiss().catch(() => {});
        this.isLoading = false;
        if (!this.loan) {
          this.loadError = 'Failed to load loan details.';
          this.toastController.create({
            message: 'Failed to load loan details.',
            duration: 3000,
            color: 'danger',
            position: 'top'
          }).then(toast => toast.present());
        }
        console.error('Loan detail load error:', err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/manage-loan']);
  }

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }
}
