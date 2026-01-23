import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AddCenterModalComponent } from './add-center-modal.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule
  ],
  declarations: [AddCenterModalComponent],
  exports: [AddCenterModalComponent]
})
export class AddCenterModalModule {}

