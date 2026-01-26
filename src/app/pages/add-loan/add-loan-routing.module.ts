import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AddLoanPage } from './add-loan.page';

const routes: Routes = [
  {
    path: '',
    component: AddLoanPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AddLoanPageRoutingModule {}
