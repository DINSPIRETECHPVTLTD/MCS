import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { OrganizationInfoPage } from './organization-info.page';

const routes: Routes = [
  {
    path: '',
    component: OrganizationInfoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OrganizationInfoPageRoutingModule {}

