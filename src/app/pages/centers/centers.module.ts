import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CentersPageRoutingModule } from './centers-routing.module';
import { CentersPage } from './centers.page';
import { HeaderMenuComponent } from '../../components/header-menu/header-menu.component';
import { AddCenterModalComponent } from './add-center-modal.component';
import { EditCenterModalComponent } from './edit-center-modal.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { AgGridModule } from 'ag-grid-angular';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatPaginatorModule,
    MatTooltipModule,
    MatButtonModule,
    CentersPageRoutingModule,
    HeaderMenuComponent,
    AgGridModule
  ],
  declarations: [CentersPage, AddCenterModalComponent, EditCenterModalComponent]
})
export class CentersPageModule {}

