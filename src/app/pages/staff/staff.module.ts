import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { StaffPageRoutingModule } from './staff-routing.module';
import { StaffPage } from './staff.page';
import { HeaderMenuComponent } from '../../components/header-menu/header-menu.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    StaffPageRoutingModule,
    HeaderMenuComponent
  ],
  declarations: [StaffPage]
})
export class StaffPageModule {}

