import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AddLoanPageRoutingModule } from './add-loan-routing.module';
import { AddLoanComponent } from './add-loan.page';
import { HeaderMenuComponent } from '../../components/header-menu/header-menu.component';
import { AgGridModule } from 'ag-grid-angular';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AddLoanPageRoutingModule,
    HeaderMenuComponent,
    AgGridModule
  ],
  declarations: [AddLoanComponent]
})
export class AddLoanPageModule {}
