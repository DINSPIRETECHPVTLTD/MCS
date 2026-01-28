import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter, ModalController, LoadingController, ToastController, AlertController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { BranchService } from '../../services/branch.service';
import { CenterService } from '../../services/center.service';
import { Branch } from '../../models/branch.models';
import { AddCenterModalComponent } from './add-center-modal/add-center-modal.component';
import { ColDef } from 'ag-grid-community';

@Component({
  selector: 'app-centers',
  templateUrl: './centers.page.html',
  styleUrls: ['./centers.page.scss']
})
export class CentersPage implements OnInit, ViewWillEnter {
  activeMenu: string = 'Centers';
  centers: any[] = [];
  selectedBranch: Branch | null = null;
  isLoading: boolean = false;

  // AG Grid configuration
  rowData: any[] = [];
  columnDefs: ColDef[] = [
    { field: 'id', headerName: 'ID', width: 80, sortable: true, filter: true },
    { field: 'name', headerName: 'Name', sortable: true, filter: true, flex: 1 },
    { field: 'centerAddress', headerName: 'Address', sortable: true, filter: true, flex: 1 },
    { field: 'city', headerName: 'City', sortable: true, filter: true, width: 150 },
    { field: 'branchName', headerName: 'Branch', sortable: true, filter: true, width: 150 },
    {
      headerName: 'Actions',
      field: 'actions',
      width: 160,
      cellRenderer: (params: any) => {
        const container = document.createElement('div');
        container.className = 'actions-cell';
        container.innerHTML = `
          <button class="ag-btn ag-edit">Edit</button>
          <button class="ag-btn ag-delete">Delete</button>
        `;
        const editBtn = container.querySelector('.ag-edit');
        const delBtn = container.querySelector('.ag-delete');
        if (editBtn) editBtn.addEventListener('click', () => params.context.componentParent.editCenter(params.data));
        if (delBtn) delBtn.addEventListener('click', () => params.context.componentParent.deleteCenter(params.data));
        return container;
      }
    }
  ];
  defaultColDef: ColDef = { 
    resizable: true, 
    sortable: true, 
    filter: true 
  };
  pagination: boolean = true;
  paginationPageSize: number = 10;
  gridOptions: any;

  constructor(
    private authService: AuthService,
    private router: Router,
    private modalController: ModalController,
    private centerService: CenterService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    // Grid options with context so cell renderers can call component methods
    this.gridOptions = {
      context: { componentParent: this }
    } as any;
  }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
  }

  ionViewWillEnter(): void {
    // Reload data when page becomes active
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadCenters();
  }

  async loadCenters(): Promise<void> {
    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Loading centers...',
      spinner: 'crescent'
    });
    await loading.present();

    this.centerService.getCenters().subscribe({
      next: (centers) => {
        loading.dismiss();
        this.isLoading = false;
        this.centers = centers;
        this.rowData = centers;
        console.log('Centers loaded:', this.centers.length);
      },
      error: (error) => {
        loading.dismiss();
        this.isLoading = false;
        this.centers = [];
        this.rowData = [];
        console.error('Error loading centers:', error);
        if (error.status !== 404) {
          this.showToast('Error loading centers: ' + (error.error?.message || error.message || 'Unknown error'), 'danger');
        }
      }
    });
  }

  async showToast(message: string, color: string = 'success'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    toast.present();
  }

  editCenter(center: any): void {
    console.log('Edit center:', center);
    // TODO: Implement edit functionality
  }

  async deleteCenter(center: any): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Confirm Delete',
      message: `Are you sure you want to delete ${center.name}?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            console.log('Delete center:', center);
            // TODO: Implement delete functionality
            this.showToast('Delete functionality not implemented yet', 'warning');
          }
        }
      ]
    });
    await alert.present();
  }

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

  onBranchChange(branch: Branch): void {
    this.selectedBranch = branch;
    console.log('Branch changed to:', branch);
  }

  async openAddCenterModal() {
    const modal = await this.modalController.create({
      component: AddCenterModalComponent,
      componentProps: {
        branch: this.selectedBranch
      }
    });
    
    await modal.present();
    
    const { data } = await modal.onWillDismiss();
    if (data && data.success) {
      // Refresh centers list after successful save
      this.loadCenters();
    }
  }
}


