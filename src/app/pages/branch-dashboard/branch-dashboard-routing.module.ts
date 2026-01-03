import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { BranchDashboardPage } from './branch-dashboard.page';

const routes: Routes = [
  {
    path: '',
    component: BranchDashboardPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BranchDashboardPageRoutingModule {}

