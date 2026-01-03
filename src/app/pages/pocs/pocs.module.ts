import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { PocsPageRoutingModule } from './pocs-routing.module';
import { PocsPage } from './pocs.page';
import { HeaderMenuComponent } from '../../components/header-menu/header-menu.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PocsPageRoutingModule,
    HeaderMenuComponent
  ],
  declarations: [PocsPage]
})
export class PocsPageModule {}

