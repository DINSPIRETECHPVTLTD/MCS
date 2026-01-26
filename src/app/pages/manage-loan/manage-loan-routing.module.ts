import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ManageLoanPage } from './manage-loan.page';

const routes: Routes = [
  {
    path: '',
    component: ManageLoanPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ManageLoanPageRoutingModule {}
