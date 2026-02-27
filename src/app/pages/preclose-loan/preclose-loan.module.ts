import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AgGridModule } from 'ag-grid-angular';
import { PrecloseLoanPageRoutingModule } from './preclose-loan-routing.module';
import { PrecloseLoanComponent } from './preclose-loan.page';
import { HeaderMenuComponent } from '../../components/header-menu/header-menu.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AgGridModule,
    PrecloseLoanPageRoutingModule,
    HeaderMenuComponent
  ],
  declarations: [PrecloseLoanComponent]
})
export class PrecloseLoanPageModule {}
