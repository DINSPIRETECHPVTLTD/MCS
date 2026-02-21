import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { AgGridModule } from 'ag-grid-angular';
import { ManageLoanPageRoutingModule } from './manage-loan-routing.module';
import { ManageLoanWrapperComponent } from './manage-loan-wrapper.component';
import { ManageLoanComponent } from './manage-loan.page';
import { LoanRepaymentSummaryComponent } from './loan-repayment-summary/loan-repayment-summary.component';
import { HeaderMenuComponent } from '../../components/header-menu/header-menu.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule,
    ManageLoanPageRoutingModule,
    HeaderMenuComponent,
    AgGridModule
  ],
  declarations: [ManageLoanWrapperComponent, ManageLoanComponent, LoanRepaymentSummaryComponent]
})
export class ManageLoanPageModule {}
