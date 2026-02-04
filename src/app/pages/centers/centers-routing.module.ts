import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CentersPage } from './centers.page';


const routes: Routes = [
  {
    path: '',
    component: CentersPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CentersPageRoutingModule {}

