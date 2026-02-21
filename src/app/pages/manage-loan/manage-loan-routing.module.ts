import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ManageLoanComponent } from './manage-loan.page';
import { LoanRepaymentSummaryComponent } from './loan-repayment-summary/loan-repayment-summary.component';

const routes: Routes = [
  {
    path: '',
    component: ManageLoanComponent
  },
  {
    path: 'repayment-summary/:loanId',
    component: LoanRepaymentSummaryComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ManageLoanPageRoutingModule {}
