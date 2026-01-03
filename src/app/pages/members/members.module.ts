import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { MembersPageRoutingModule } from './members-routing.module';
import { MembersPage } from './members.page';
import { HeaderMenuComponent } from '../../components/header-menu/header-menu.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MembersPageRoutingModule,
    HeaderMenuComponent
  ],
  declarations: [MembersPage]
})
export class MembersPageModule {}

