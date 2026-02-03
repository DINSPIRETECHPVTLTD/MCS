import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { OrganizationInfoPageRoutingModule } from './organization-info-routing.module';
import { OrganizationInfoComponent } from './organization-info.page';
import { HeaderMenuComponent } from '../../components/header-menu/header-menu.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    OrganizationInfoPageRoutingModule,
    HeaderMenuComponent
  ],
  declarations: [OrganizationInfoComponent]
})
export class OrganizationInfoPageModule {}

