import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PrecloseLoanPage } from './preclose-loan.page';

const routes: Routes = [
  {
    path: '',
    component: PrecloseLoanPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PrecloseLoanPageRoutingModule {}
