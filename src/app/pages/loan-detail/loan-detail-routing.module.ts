import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LoanDetailComponent } from './loan-detail.page';

const routes: Routes = [
  {
    path: '',
    component: LoanDetailComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LoanDetailPageRoutingModule {}
