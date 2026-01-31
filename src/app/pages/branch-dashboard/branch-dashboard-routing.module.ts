import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { BranchDashboardComponent } from './branch-dashboard.page';

const routes: Routes = [
  {
    path: '',
    component: BranchDashboardComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BranchDashboardPageRoutingModule {}

