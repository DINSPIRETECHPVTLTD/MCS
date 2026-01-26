import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { StaffPageRoutingModule } from './staff-routing.module';
import { StaffPage } from './staff.page';
import { AddStaffModalComponent } from './add-staff-modal.component';
import { HeaderMenuComponent } from '../../components/header-menu/header-menu.component';
import { AgGridModule } from 'ag-grid-angular';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    StaffPageRoutingModule,
    HeaderMenuComponent,
    AgGridModule
  ],
  declarations: [StaffPage, AddStaffModalComponent]
})
export class StaffPageModule {}

