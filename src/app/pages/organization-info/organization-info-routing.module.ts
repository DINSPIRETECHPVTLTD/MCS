import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { OrganizationInfoComponent } from './organization-info.page';

const routes: Routes = [
  {
    path: '',
    component: OrganizationInfoComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OrganizationInfoPageRoutingModule {}

