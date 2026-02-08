import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { LoanDetailPageRoutingModule } from './loan-detail-routing.module';
import { LoanDetailComponent } from './loan-detail.page';
import { HeaderMenuComponent } from '../../components/header-menu/header-menu.component';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    LoanDetailPageRoutingModule,
    HeaderMenuComponent
  ],
  declarations: [LoanDetailComponent]
})
export class LoanDetailPageModule {}
