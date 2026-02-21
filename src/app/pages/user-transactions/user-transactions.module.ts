import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { UserTransactionsPageRoutingModule } from './user-transactions-routing.module';
import { UserTransactionsComponent } from './user-transactions.page';
import { HeaderMenuComponent } from '../../components/header-menu/header-menu.component';
import { AgGridModule } from 'ag-grid-angular';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    UserTransactionsPageRoutingModule,
    HeaderMenuComponent,
    AgGridModule
  ],
  declarations: [UserTransactionsComponent]
})
export class UserTransactionsPageModule {}
