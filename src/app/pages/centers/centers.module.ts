import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CentersPageRoutingModule } from './centers-routing.module';
import { CentersPage } from './centers.page';
import { HeaderMenuComponent } from '../../components/header-menu/header-menu.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CentersPageRoutingModule,
    HeaderMenuComponent
  ],
  declarations: [CentersPage]
})
export class CentersPageModule {}

