import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { PrecloseLoanPageRoutingModule } from './preclose-loan-routing.module';
import { PrecloseLoanPage } from './preclose-loan.page';
import { HeaderMenuComponent } from '../../components/header-menu/header-menu.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PrecloseLoanPageRoutingModule,
    HeaderMenuComponent
  ],
  declarations: [PrecloseLoanPage]
})
export class PrecloseLoanPageModule {}
