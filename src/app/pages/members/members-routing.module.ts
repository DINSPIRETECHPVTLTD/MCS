import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MembersComponent } from './members.page';

const routes: Routes = [
  {
    path: '',
    component: MembersComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MembersPageRoutingModule {}

