import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { RecoveryPostingComponent } from './recovery-posting.page';

const routes: Routes = [
  {
    path: '',
    component: RecoveryPostingComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RecoveryPostingPageRoutingModule {}
