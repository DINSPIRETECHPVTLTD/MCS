import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import {
  ViewWillEnter,
  ModalController,
  ToastController,
  AlertController
} from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { Branch } from '../../models/branch.models';
import { CenterService } from '../../services/center.service';
import { Center } from '../../models/center.models';
import { Subscription } from 'rxjs';
import { ColDef, GridApi, GridOptions, GridReadyEvent, ICellRendererParams } from 'ag-grid-community';
import { agGridTheme } from '../../ag-grid-theme';


@Component({
  selector: 'app-centers',
  templateUrl: './centers.page.html'
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class CentersPage implements OnInit, OnDestroy, ViewWillEnter {
  activeMenu: string = 'Centers';
  rowData: Center[] = [];
  isLoading = false;
  private subscriptions = new Subscription();

  selectedBranchId: number | null = null;

  // AG Grid
  columnDefs: ColDef<Center>[] = [];
  defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    filter: true,
    floatingFilter: false
  };
  pagination: boolean = true;
  paginationPageSize: number = 20;
  paginationPageSizeSelector: number[] = [10, 20, 50, 100];
  gridOptions: GridOptions;
  gridApi!: GridApi;

  constructor(
    private authService: AuthService,
    private router: Router,
    private centerService: CenterService,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    this.gridOptions = {
      theme: agGridTheme,
      context: { componentParent: this }
    } as GridOptions;
  }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.columnDefs = [
      {
        headerName: 'Id',
        field: 'id',
        width: 70,
        minWidth: 70,
        maxWidth: 70,
        suppressSizeToFit: true,
      },
      {
        headerName: 'Center Name',
        field: 'name',
        width: 200,
        minWidth: 200,
        maxWidth: 300,
        resizable: true,
      },
      {
        headerName: 'Address',
        field: 'centerAddress',
        width: 500,
        minWidth: 300,
        maxWidth: 600,
        resizable: true,
        suppressSizeToFit: true,
        valueGetter: (p) => this.buildDisplayAddress(p.data?.centerAddress, p.data?.city),
        tooltipValueGetter: (p) => this.buildDisplayAddress(p.data?.centerAddress, p.data?.city),
        cellClass: 'truncate'
      },
      {
        headerName: 'Actions',
        colId: 'actions',
        width: 200,
        minWidth: 200,
        maxWidth: 200,
        suppressSizeToFit: true,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<Center>) => {
          const container = document.createElement('div');
          container.className = 'actions-cell';
          container.innerHTML = `
            <button class="ag-btn ag-edit">Edit</button>
            <button class="ag-btn ag-delete">Inactive</button>
          `;

          const editBtn = container.querySelector('.ag-edit');
          const delBtn = container.querySelector('.ag-delete');
          if (editBtn) editBtn.addEventListener('click', () => params.context.componentParent.editCenter(params.data));
          if (delBtn) delBtn.addEventListener('click', () => params.context.componentParent.deleteCenter(params.data));
          return container;
        }
      }
    ];

    // Use authService.getBranchId() — returns number
    this.selectedBranchId = this.authService.getBranchId();

    // ✅ Subscribe to centers$ so rowData stays in sync with every load
    // Note: no manual loadCenters() here — HeaderMenuComponent emits branchChange
    // on startup (in setSelectedBranch), which triggers onBranchChange() below.
    const centersSub = this.centerService.centers$.subscribe((centers) => {
      this.rowData = centers;
      this.isLoading = false;
    });
    this.subscriptions.add(centersSub);

    // ✅ Trigger initial load only when a valid branchId is available
    if (this.selectedBranchId !== null) {
      this.isLoading = true;
      this.centerService.loadCenters(this.selectedBranchId);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  ionViewWillEnter(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

  onBranchChange(branch: Branch): void {
    this.selectedBranchId = branch.id;
  }

  buildDisplayAddress(address?: string, city?: string): string {
    return [address, city].filter(Boolean).join(', ');
  }

  async openAddCenterModal(): Promise<void> {
    // TODO: wire up AddCenterModalComponent when available
    await this.showToast('Add Center modal coming soon', 'primary');
  }

  editCenter(center: Center | undefined): void {
    if (!center) return;
    // TODO: wire up EditCenterModalComponent when available
    void this.showToast(`Edit center: ${center.name}`, 'primary');
  }

  async deleteCenter(center: Center | undefined): Promise<void> {
    if (!center?.id) return;

    const alert = await this.alertController.create({
      header: 'Confirm Inactive',
      message: `Are you sure you want to set center "${center.name}" as inactive?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Inactive',
          handler: async () => {
            this.centerService.deleteCenter(center.id!).subscribe({
              next: async () => {
                await this.showToast('Center set inactive successfully', 'success');
              },
              error: async (err: Error) => {
                await this.showToast('Failed to inactivate center: ' + err.message, 'danger');
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