import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AddBranchComponent } from './add-branch.page';

const routes: Routes = [
  {
    path: '',
    component: AddBranchComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AddBranchPageRoutingModule {}

