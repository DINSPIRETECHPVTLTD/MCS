import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ApprovalsPage } from './approvals.page';

const routes: Routes = [
  {
    path: '',
    component: ApprovalsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ApprovalsPageRoutingModule {}

