import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ToastController, ViewWillEnter, ModalController, AlertController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { MasterDataService } from '../../services/master-data.service';
import { MasterLookup } from '../../models/master-data.models';
import { AddMasterDataModalComponent } from './add-master-data-modal.component';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { agGridTheme } from '../../ag-grid-theme';
import { Branch } from '../../models/branch.models';

@Component({
  selector: 'app-master-data',
  templateUrl: './master-data.page.html',
  styleUrls: ['./master-data.page.scss']
})
export class MasterDataComponent implements OnInit, ViewWillEnter {
  activeMenu = 'Master Data';
  items: MasterLookup[] = [];
  rowData: MasterLookup[] = [];
  columnDefs: ColDef[] = [];
  defaultColDef: ColDef = { sortable: true, filter: true, resizable: true };
  pagination = true;
  paginationPageSize = 20;
  paginationPageSizeSelector: number[] = [10, 20, 50, 100];
  showAddForm = false;
  isEditing = false;
  editingId: number | null = null;
  isLoading = false;
  includeInactive = false;

  private gridApi?: GridApi;
  gridOptions = { theme: agGridTheme, getContext: () => ({ componentParent: this }) };
  get gridContext(): { componentParent: MasterDataComponent } {
    return { componentParent: this };
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    private masterDataService: MasterDataService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private modalController: ModalController,
    private alertController: AlertController
  ) {
    this.columnDefs = [
      { headerName: 'ID', field: 'id', width: 70, filter: 'agNumberColumnFilter', sortable: true,hide: true },
      { headerName: 'Lookup Key', field: 'lookupKey', width: 130, filter: 'agTextColumnFilter', sortable: true },
      { headerName: 'Lookup Code', field: 'lookupCode', width: 120, filter: 'agTextColumnFilter', sortable: true },
      { headerName: 'Lookup Value', field: 'lookupValue', width: 180, filter: 'agTextColumnFilter', sortable: true },
      { headerName: 'Numeric Value', field: 'numericValue', width: 110, filter: 'agNumberColumnFilter', sortable: true, valueFormatter: (p) => p.value != null ? String(Number(p.value)) : '' },
      { headerName: 'Sort Order', field: 'sortOrder', width: 100, filter: 'agNumberColumnFilter', sortable: true },
      { headerName: 'Description', field: 'description', flex: 1, filter: 'agTextColumnFilter', sortable: true, hide: true },
      {
        headerName: 'Status',
        width: 90,
        filter: 'agTextColumnFilter',
        sortable: true,
        valueGetter: (p) => (p.data as MasterLookup)?.isActive === false ? 'Inactive' : 'Active'
      },
      {
        headerName: 'Actions',
        width: 160,
        sortable: false,
        filter: false,
        cellRenderer: (params: { data: MasterLookup; context?: { componentParent: MasterDataComponent } }) => {
          const container = document.createElement('div');
          container.className = 'actions-cell';
          const comp = (params.context as { componentParent?: MasterDataComponent })?.componentParent ?? this;
          const isInactive = (params.data as MasterLookup)?.isActive === false;
          container.innerHTML = `
            <button class="ag-btn ag-edit" title="Edit" style="background: var(--ion-color-primary); color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer; font-weight: 500; margin-right: 8px;">Edit</button>
            <button class="ag-btn ag-delete" title="Inactive" style="background: var(--ion-color-danger); color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer; font-weight: 500;">Inactive</button>
          `;
          const editBtn = container.querySelector('.ag-edit');
          const deleteBtn = container.querySelector('.ag-delete');
          if (editBtn) editBtn.addEventListener('click', () => comp.editItem(params.data));
          if (deleteBtn && !isInactive) deleteBtn.addEventListener('click', () => comp.deleteItem(params.data));
          if (deleteBtn && isInactive) (deleteBtn as HTMLButtonElement).disabled = true;
          return container;
        }
      }
    ];
  }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
  }

  ionViewWillEnter(): void {
    if (this.authService.isAuthenticated()) {
      this.loadMasterData();
    }
  }

  async loadMasterData(): Promise<void> {
    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Loading master data...',
      spinner: 'crescent'
    });
    await loading.present();
    this.masterDataService.getMasterData(this.includeInactive).subscribe({
      next: (list) => {
        loading.dismiss();
        this.isLoading = false;
        this.items = list ?? [];
        this.rowData = [...this.items];
        if (this.gridApi) {
          this.gridApi.setGridOption('rowData', this.rowData);
          setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);
        }
      },
      error: () => {
        loading.dismiss();
        this.isLoading = false;
        this.items = [];
        this.rowData = [];
        if (this.gridApi) this.gridApi.setGridOption('rowData', []);
        this.showToast('Failed to load master data', 'danger');
      }
    });
  }

  async toggleAddForm(): Promise<void> {
    if (this.showAddForm) {
      const modal = await this.modalController.getTop();
      if (modal) await this.modalController.dismiss();
      this.showAddForm = false;
      this.resetForm();
    } else {
      this.isEditing = false;
      this.editingId = null;
      this.showAddForm = true;
      await this.openModal();
    }
  }

  async openModal(): Promise<void> {
    const modal = await this.modalController.create({
      component: AddMasterDataModalComponent,
      componentProps: {
        isEditing: this.isEditing,
        editingId: this.editingId
      },
      cssClass: 'add-master-data-modal'
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data?.success) {
      this.loadMasterData();
    }
    this.showAddForm = false;
    this.resetForm();
  }

  resetForm(): void {
    this.isEditing = false;
    this.editingId = null;
  }

  editItem(item: MasterLookup): void {
    if (!item?.id) return;
    this.isEditing = true;
    this.editingId = item.id;
    this.showAddForm = true;
    this.openModal();
  }

  async deleteItem(item: MasterLookup): Promise<void> {
    if (!item?.id) return;
    const alert = await this.alertController.create({
      header: 'Confirm deactivate',
      message: `Deactivate "${item.lookupValue}" (${item.lookupCode})? You can reactivate by editing later.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Deleting...',
              spinner: 'crescent'
            });
            await loading.present();
            this.masterDataService.softDeleteMasterData(item.id!).subscribe({
              next: async () => {
                await loading.dismiss();
                this.showToast('Deleted successfully', 'success');
                this.loadMasterData();
              },
              error: async (err) => {
                await loading.dismiss();
                this.showToast(err?.error?.message || 'Failed to delete', 'danger');
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.setGridOption('context', { componentParent: this });
    if (this.rowData?.length) {
      this.gridApi.setGridOption('rowData', this.rowData);
    }
    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);
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

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

  onBranchChange(_branch: Branch): void {}

  toggleIncludeInactive(): void {
    this.includeInactive = !this.includeInactive;
    this.loadMasterData();
  }
}
