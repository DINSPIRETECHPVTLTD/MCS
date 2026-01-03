import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { BranchDashboardPageRoutingModule } from './branch-dashboard-routing.module';
import { BranchDashboardPage } from './branch-dashboard.page';
import { HeaderMenuComponent } from '../../components/header-menu/header-menu.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    BranchDashboardPageRoutingModule,
    HeaderMenuComponent
  ],
  declarations: [BranchDashboardPage]
})
export class BranchDashboardPageModule {}

