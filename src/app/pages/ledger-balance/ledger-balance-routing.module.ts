import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LedgerBalanceComponent } from './ledger-balance.page';

const routes: Routes = [
  {
    path: '',
    component: LedgerBalanceComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LedgerBalanceRoutingModule {}
