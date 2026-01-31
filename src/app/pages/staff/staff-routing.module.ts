import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { StaffComponent } from './staff.page';

const routes: Routes = [
  {
    path: '',
    component: StaffComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class StaffPageRoutingModule {}

