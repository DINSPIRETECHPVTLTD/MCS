import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter, ModalController, LoadingController, ToastController, AlertController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { Branch } from '../../models/branch.models';
import { AddPocModalComponent } from './add-poc-modal.component';
import { ColDef } from 'ag-grid-community';
import { agGridTheme } from '../../ag-grid-theme';
import { Poc, PocService } from '../../services/poc.service';
import { MemberService } from '../../services/member.service';

@Component({
  selector: 'app-pocs',
  templateUrl: './pocs.page.html'
})
export class PocsComponent implements OnInit, ViewWillEnter {
  activeMenu: string = 'POCs';
  pocs: Poc[] = [];
  selectedBranch: Branch | null = null;
  isLoading: boolean = false;

  // AG Grid configuration
  rowData: Poc[] = [];
  columnDefs: ColDef[] = [
    { field: 'id', headerName: 'ID', width: 80, sortable: true, filter: true },
    { 
      headerName: 'Full Name',
      valueGetter: (params: any) => {
        const first = params.data?.fullName || '';
        const last = params.data?.surname || '';
        return [first, last].filter(Boolean).join(' ');
      },
      sortable: true, 
      filter: true, 
      flex: 1 
    },
    {
      headerName: 'Contact Numbers',
      valueGetter: (params: any) => {
        const p1 = params.data?.phoneNumber || '';
        const p2 = params.data?.altPhone || '';
        return [p1, p2].filter(Boolean).join(', ');
      },
      sortable: true,
      filter: true,
      width: 180
    },
    { 
      headerName: 'Address', 
      valueGetter: (params: any) => {
        const a1 = params.data?.address1 || '';
        const a2 = params.data?.address2 || '';
        const city = params.data?.city || '';
        const state = params.data?.state || '';
        const pin = params.data?.pinCode || '';
        return [a1, a2, city, state, pin].filter(Boolean).join(', ');
      }, 
      sortable: true, 
      filter: true, 
      flex: 1 
    },
    { 
      headerName: 'Center Name',
      valueGetter: (params: any) => params.context?.componentParent?.getCenterName(params.data?.centerId),
      sortable: true,
      filter: true,
      width: 160
    },
    {
      headerName: 'Actions',
      field: 'actions',
      width: 160,
      cellRenderer: (params: any) => {
        const container = document.createElement('div');
        container.className = 'actions-cell';
        container.innerHTML = `
          <button class="ag-btn ag-edit">Edit</button>
          <button class="ag-btn ag-delete">Inactive</button>
        `;
        const editBtn = container.querySelector('.ag-edit');
        const delBtn = container.querySelector('.ag-delete');
        if (editBtn) editBtn.addEventListener('click', () => params.context.componentParent.editPoc(params.data));
        if (delBtn) delBtn.addEventListener('click', () => params.context.componentParent.deletePoc(params.data));
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
  paginationPageSize: number = 20;
  paginationPageSizeSelector: number[] = [10, 20, 50, 100];
  gridOptions: any;
  gridApi: any;
  centerNameMap: Record<number, string> = {};

  constructor(
    private authService: AuthService,
    private router: Router,
    private modalController: ModalController,
    private pocService: PocService,
    private memberService: MemberService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    // Grid options with context so cell renderers can call component methods
    this.gridOptions = {
      theme: agGridTheme,
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
    // Load POCs data
    if (this.selectedBranch) {
      this.loadCenters(this.selectedBranch.id);
      this.loadPocs();
    }
  }

  onGridReady(params: any): void {
    this.gridApi = params.api;
  }

  async loadPocs(): Promise<void> {
    if (!this.selectedBranch) {
      console.log('No branch selected, cannot load POCs');
      return;
    }

    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Loading POCs...',
      spinner: 'crescent'
    });
    await loading.present();

    this.pocService.getPocsByBranch(this.selectedBranch.id).subscribe({
      next: (pocs) => {
        loading.dismiss();
        this.isLoading = false;
        this.pocs = pocs;
        this.rowData = pocs;
        console.log('POCs loaded:', this.pocs.length);
      },
      error: (error) => {
        loading.dismiss();
        this.isLoading = false;
        console.error('Error loading POCs:', error);
        this.pocs = [];
        this.rowData = [];
        if (error.status !== 404) {
          this.showToast('Error loading POCs: ' + (error.error?.message || error.message || 'Unknown error'), 'danger');
        } else {
          console.log('No POCs found for this branch');
          this.showToast('No POCs found for this branch', 'warning');
        }
      }
    });
  }

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

  onBranchChange(branch: Branch): void {
    console.log('Branch changed to:', branch);
    this.selectedBranch = branch;
    // Load POCs for the selected branch
    this.loadCenters(branch.id);
    this.loadPocs();
  }

  loadCenters(branchId: number): void {
    this.memberService.getCentersByBranch(branchId).subscribe({
      next: (centers) => {
        const map: Record<number, string> = {};
        (centers || []).forEach(center => {
          const id = Number(center?.id);
          if (!Number.isNaN(id) && id > 0) {
            map[id] = center?.name || '';
          }
        });
        this.centerNameMap = map;
        if (this.gridApi) {
          this.gridApi.refreshCells({ force: true });
        }
      },
      error: (error) => {
        console.error('Error loading centers:', error);
        this.centerNameMap = {};
        if (this.gridApi) {
          this.gridApi.refreshCells({ force: true });
        }
      }
    });
  }

  getCenterName(centerId?: number): string {
    if (!centerId) return '';
    return this.centerNameMap[centerId] || centerId.toString();
  }

  async openAddPocModal(): Promise<void> {
    const modal = await this.modalController.create({
      component: AddPocModalComponent,
      componentProps: {
        isEditing: false,
        branchId: this.selectedBranch?.id || null
      },
      cssClass: 'add-modal'
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data && data.success) {
      console.log('POC created successfully:', data.data);
      this.loadPocs();
    }
  }

  editPoc(poc: Poc): void {
    this.openEditPocModal(poc);
  }

  async openEditPocModal(poc: Poc): Promise<void> {
    const modal = await this.modalController.create({
      component: AddPocModalComponent,
      componentProps: {
        isEditing: true,
        editingPocId: poc.id,
        branchId: this.selectedBranch?.id || null
      },
      cssClass: 'add-modal'
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data && data.success) {
      console.log('POC updated successfully:', data.data);
      this.loadPocs();
    }
  }

  async deletePoc(poc: Poc): Promise<void> {
    const fullName = poc.fullName;
    const alert = await this.alertController.create({
      header: 'Confirm Delete',
      message: `Are you sure you want to delete POC "${fullName}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          handler: async () => {
            if (!poc.id) {
              this.showToast('Invalid POC ID', 'danger');
              return;
            }
            const loading = await this.loadingController.create({ 
              message: 'Deleting...', 
              spinner: 'crescent' 
            });
            await loading.present();
            this.pocService.deletePoc(poc.id).subscribe({
              next: async () => {
                await loading.dismiss();
                this.showToast('POC deleted successfully', 'success');
                this.loadPocs();
              },
              error: async (err: any) => {
                await loading.dismiss();
                console.error('Delete error', err);
                this.showToast('Failed to delete POC', 'danger');
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}

