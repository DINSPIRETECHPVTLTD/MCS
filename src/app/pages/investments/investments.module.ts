import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { InvestmentsPageRoutingModule } from './investments-routing.module';
import { InvestmentsComponent} from './investments.page';
import { HeaderMenuComponent } from '../../components/header-menu/header-menu.component';
import { AgGridModule } from 'ag-grid-angular';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    InvestmentsPageRoutingModule,
    HeaderMenuComponent,
    AgGridModule
  ],
  declarations: [InvestmentsComponent]
})
export class InvestmentsPageModule {}
