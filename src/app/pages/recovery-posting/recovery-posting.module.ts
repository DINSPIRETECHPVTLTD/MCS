import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RecoveryPostingPageRoutingModule } from './recovery-posting-routing.module';
import { RecoveryPostingPage } from './recovery-posting.page';
import { HeaderMenuComponent } from '../../components/header-menu/header-menu.component';
import { AgGridModule } from 'ag-grid-angular';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RecoveryPostingPageRoutingModule,
    HeaderMenuComponent,
    AgGridModule
  ],
  declarations: [RecoveryPostingPage]
})
export class RecoveryPostingPageModule {}
