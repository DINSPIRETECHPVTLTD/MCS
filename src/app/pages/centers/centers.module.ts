import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CentersPageRoutingModule } from './centers-routing.module';
import { CentersPage } from './centers.page';
import { HeaderMenuComponent } from '../../components/header-menu/header-menu.component';
import { AddCenterModalModule } from './add-center-modal/add-center-modal.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CentersPageRoutingModule,
    HeaderMenuComponent,
    AddCenterModalModule
  ],
  declarations: [CentersPage]
})
export class CentersPageModule {}

