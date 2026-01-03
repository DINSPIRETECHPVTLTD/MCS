import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PocsPage } from './pocs.page';

const routes: Routes = [
  {
    path: '',
    component: PocsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PocsPageRoutingModule {}

