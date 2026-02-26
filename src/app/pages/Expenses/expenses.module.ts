import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ExpensesPageRoutingModule } from './expenses-routing.module';
import { ExpensesComponent } from './expenses.page';
import { HeaderMenuComponent } from '../../components/header-menu/header-menu.component';
import { AgGridModule } from 'ag-grid-angular';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ExpensesPageRoutingModule,
    HeaderMenuComponent,
    AgGridModule
  ],
  declarations: [ExpensesComponent]
})
export class ExpensesPageModule {}
