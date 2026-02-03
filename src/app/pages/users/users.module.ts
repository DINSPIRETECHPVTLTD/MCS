import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { UsersPageRoutingModule } from './users-routing.module';
import { UsersComponent } from './users.page';
import { AddUserModalComponent } from './add-user-modal.component';
import { HeaderMenuComponent } from '../../components/header-menu/header-menu.component';
import { AgGridModule } from 'ag-grid-angular';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    UsersPageRoutingModule,
    HeaderMenuComponent,
    AgGridModule
  ],
  declarations: [UsersComponent, AddUserModalComponent]
})
export class UsersPageModule {}

