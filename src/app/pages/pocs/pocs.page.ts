import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter, ModalController, ToastController, AlertController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { Branch } from '../../models/branch.models';
import { AddPocModalComponent } from './add-poc-modal.component';
import { ColDef, ValueGetterParams, ICellRendererParams, GridOptions, GridApi, GridReadyEvent } from 'ag-grid-community';
import { agGridTheme } from '../../ag-grid-theme';
import { Poc, PocService } from '../../services/poc.service';
import { CenterService } from '../../services/center.service';
import { UserService } from '../../services/user.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-pocs',
  templateUrl: './pocs.page.html'
})
export class PocsComponent implements OnInit, OnDestroy, ViewWillEnter {
  activeMenu: string = 'POCs';
  selectedBranch: Branch | null = null;
  selectedBranchId: number | null = null;
  isLoading: boolean = false;
  private subscriptions = new Subscription();

  // AG Grid configuration
  rowData: Poc[] = [];
  columnDefs: ColDef[] = [
    {
      headerName: 'Name',
      valueGetter: (params: ValueGetterParams) => {
        const first = params.data?.firstName || '';
        const last = params.data?.lastName || '';
        return [first, last].filter(Boolean).join(' ');
      },
      sortable: true,
      filter: true,
      flex: 1
    },
    {
      headerName: 'Contact Numbers',
      valueGetter: (params: ValueGetterParams) => {
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
      valueGetter: (params: ValueGetterParams) => {
        const a1 = params.data?.address1 || '';
        const a2 = params.data?.address2 || '';
        const city = params.data?.city || '';
        const state = params.data?.state || '';
        const pin = params.data?.zipCode || '';
        return [a1, a2, city, state, pin].filter(Boolean).join(', ');
      },
      sortable: true,
      filter: true,
      flex: 1
    },
    {
      headerName: 'Center Name',
      valueGetter: (params: ValueGetterParams) => params.context?.componentParent?.getCenterName(params.data?.centerId),
      sortable: true,
      filter: true,
      width: 160
    },
    {
      headerName: 'Collection Frequency',
      field: 'collectionFrequency',
      sortable: true,
      filter: true,
      width: 150
    },
    {
      headerName: 'Collection Day',
      field: 'collectionDay',
      sortable: true,
      filter: true,
      width: 130
    },
    {
      headerName: 'Collection By',
      valueGetter: (params: ValueGetterParams) => params.context?.componentParent?.getUserName(params.data?.collectionBy),
      sortable: true,
      filter: true,
      width: 150
    },
    {
      headerName: 'Actions',
      field: 'actions',
      width: 160,
      cellRenderer: (params: ICellRendererParams) => {
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
  gridOptions: GridOptions;
  gridApi!: GridApi;
  centerNameMap: Record<number, string> = {};
  userNameMap: Record<number, string> = {};

  constructor(
    private authService: AuthService,
    private router: Router,
    private modalController: ModalController,
    private pocService: PocService,
    private centerService: CenterService,
    private userService: UserService,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    // Grid options with context so cell renderers can call component methods
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
    this.selectedBranchId = this.authService.getBranchId();

    // Subscribe once — all refreshes flow through here
    const sub = this.pocService.pocs$.subscribe(pocs => {
      this.rowData = pocs;
      this.isLoading = false;
    });
    this.subscriptions.add(sub);

    // Load POCs data
    if (this.selectedBranchId) {
      this.loadCenters(this.selectedBranchId);
      this.loadUsers();
      this.loadPocs();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  ionViewWillEnter(): void {
    // Reload data when page becomes active
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  loadPocs(): void {
    if (!this.selectedBranchId) return;
    this.isLoading = true;
    // loadPocsByBranch pushes into pocs$ — our subscriber above handles the result
    this.pocService.loadPocsByBranch(this.selectedBranchId);
  }

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

  onBranchChange(branch: Branch): void {
    this.selectedBranch = branch;
  }

  loadCenters(branchId: number): void {
    this.centerService.loadCenters(branchId);
    const sub = this.centerService.centers$.subscribe({
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
      error: () => {
        this.centerNameMap = {};
        if (this.gridApi) {
          this.gridApi.refreshCells({ force: true });
        }
      }
    });
    this.subscriptions.add(sub);
  }

  getCenterName(centerId?: number): string {
    if (!centerId) return '';
    return this.centerNameMap[centerId] || centerId.toString();
  }

  loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (users) => {
        const map: Record<number, string> = {};
        (users || []).forEach(user => {
          const id = Number(user?.id);
          if (!Number.isNaN(id) && id > 0) {
            const firstName = user?.firstName || '';
            const lastName = user?.lastName || '';
            map[id] = [firstName, lastName].filter(Boolean).join(' ') || id.toString();
          }
        });
        this.userNameMap = map;
        if (this.gridApi) {
          this.gridApi.refreshCells({ force: true });
        }
      },
      error: () => {
        this.userNameMap = {};
        if (this.gridApi) {
          this.gridApi.refreshCells({ force: true });
        }
      }
    });
  }

  getUserName(userId?: number): string {
    if (!userId) return '';
    return this.userNameMap[userId] || userId.toString();
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
      this.loadPocs();
    }
  }

  async editPoc(poc: Poc): Promise<void> {
    await this.openEditPocModal(poc);
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
      this.loadPocs();
    }
  }

  async deletePoc(poc: Poc): Promise<void> {
    const fullName = [poc.firstName, poc.lastName].filter(Boolean).join(' ');
    const alert = await this.alertController.create({
      header: 'Confirm Inactive',
      message: `Are you sure you want to inactive POC "${fullName}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Inactive',
          handler: async () => {
            if (!poc.id) {
              this.showToast('Invalid POC ID', 'danger');
              return;
            }
            this.pocService.deletePoc(poc.id).subscribe({
              next: async () => {
                this.showToast('POC set inactive successfully', 'success');
                this.loadPocs();
              },
              error: async (err: Error) => {
                this.showToast('Failed to inactivate POC: ' + err.message, 'danger');
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

