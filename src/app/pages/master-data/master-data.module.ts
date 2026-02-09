import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AgGridModule } from 'ag-grid-angular';
import { MasterDataPageRoutingModule } from './master-data-routing.module';
import { MasterDataComponent } from './master-data.page';
import { AddMasterDataModalComponent } from './add-master-data-modal.component';
import { HeaderMenuComponent } from '../../components/header-menu/header-menu.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    MasterDataPageRoutingModule,
    HeaderMenuComponent,
    AgGridModule
  ],
  declarations: [MasterDataComponent, AddMasterDataModalComponent]
})
export class MasterDataPageModule {}
