import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { LedgerBalanceRoutingModule } from './ledger-balance-routing.module';
import { LedgerBalanceComponent } from './ledger-balance.page';
import { HeaderMenuComponent } from '../../components/header-menu/header-menu.component';
import { AgGridModule } from 'ag-grid-angular';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    LedgerBalanceRoutingModule,
    HeaderMenuComponent,
    AgGridModule
  ],
  declarations: [LedgerBalanceComponent]
})
export class LedgerBalanceModule {}
