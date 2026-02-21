import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AgGridModule } from 'ag-grid-angular';
import { ManageLoanPageRoutingModule } from './manage-loan-routing.module';
import { ManageLoanComponent } from './manage-loan.page';
import { LoanRepaymentSummaryComponent } from './loan-repayment-summary/loan-repayment-summary.component';
import { HeaderMenuComponent } from '../../components/header-menu/header-menu.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ManageLoanPageRoutingModule,
    HeaderMenuComponent,
    AgGridModule
  ],
  declarations: [ManageLoanComponent, LoanRepaymentSummaryComponent]
})
export class ManageLoanPageModule {}
