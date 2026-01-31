import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ApprovalsPageRoutingModule } from './approvals-routing.module';
import { ApprovalsComponent } from './approvals.page';
import { HeaderMenuComponent } from '../../components/header-menu/header-menu.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ApprovalsPageRoutingModule,
    HeaderMenuComponent
  ],
  declarations: [ApprovalsComponent]
})
export class ApprovalsPageModule {}

