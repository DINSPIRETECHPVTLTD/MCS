import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { UserTransactionsComponent } from './user-transactions.page';

const routes: Routes = [
  {
    path: '',
    component: UserTransactionsComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UserTransactionsPageRoutingModule {}
