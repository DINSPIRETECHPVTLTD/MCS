import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ManageLoanPageRoutingModule } from './manage-loan-routing.module';
import { ManageLoanPage } from './manage-loan.page';
import { HeaderMenuComponent } from '../../components/header-menu/header-menu.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ManageLoanPageRoutingModule,
    HeaderMenuComponent
  ],
  declarations: [ManageLoanPage]
})
export class ManageLoanPageModule {}
