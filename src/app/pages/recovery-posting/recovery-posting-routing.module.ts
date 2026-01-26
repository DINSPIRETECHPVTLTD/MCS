import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { RecoveryPostingPage } from './recovery-posting.page';

const routes: Routes = [
  {
    path: '',
    component: RecoveryPostingPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RecoveryPostingPageRoutingModule {}
