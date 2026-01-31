import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AddLoanComponent } from './add-loan.page';

const routes: Routes = [
  {
    path: '',
    component: AddLoanComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AddLoanPageRoutingModule {}
