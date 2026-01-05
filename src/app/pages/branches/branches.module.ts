import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { BranchesPageRoutingModule } from './branches-routing.module';
import { BranchesPage } from './branches.page';
import { AddBranchModalComponent } from './add-branch-modal.component';
import { HeaderMenuComponent } from '../../components/header-menu/header-menu.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    BranchesPageRoutingModule,
    HeaderMenuComponent
  ],
  declarations: [BranchesPage, AddBranchModalComponent]
})
export class BranchesPageModule {}

