import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PocsComponent } from './pocs.page';

const routes: Routes = [
  {
    path: '',
    component: PocsComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PocsPageRoutingModule {}

