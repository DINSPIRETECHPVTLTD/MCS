import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ManageLoanComponent } from './manage-loan.page';

const routes: Routes = [
  {
    path: '',
    component: ManageLoanComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ManageLoanPageRoutingModule {}
