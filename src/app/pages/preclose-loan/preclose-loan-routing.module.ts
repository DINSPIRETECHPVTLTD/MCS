import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PrecloseLoanComponent } from './preclose-loan.page';

const routes: Routes = [
  {
    path: '',
    component: PrecloseLoanComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PrecloseLoanPageRoutingModule {}
