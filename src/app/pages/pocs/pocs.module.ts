import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { PocsPageRoutingModule } from './pocs-routing.module';
import { PocsPage } from './pocs.page';
import { HeaderMenuComponent } from '../../components/header-menu/header-menu.component';
import { AddPocModalComponent } from './add-poc-modal.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    PocsPageRoutingModule,
    HeaderMenuComponent
  ],
  declarations: [PocsPage, AddPocModalComponent]
})
export class PocsPageModule {}

