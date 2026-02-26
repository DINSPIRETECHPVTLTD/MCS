import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CentersPageRoutingModule } from './centers-routing.module';
import { CentersPage } from './centers.page';
import { AddCenterModalComponent } from './add-center-modal.component';
import { HeaderMenuComponent } from '../../components/header-menu/header-menu.component';
import { AgGridModule } from 'ag-grid-angular';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    CentersPageRoutingModule,
    HeaderMenuComponent,
    AgGridModule
  ],
  declarations: [CentersPage, AddCenterModalComponent]
})
export class CentersPageModule { }


