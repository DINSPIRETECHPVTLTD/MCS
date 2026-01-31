import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController, ViewWillEnter, ModalController, AlertController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { BranchService } from '../../services/branch.service';
import { Branch } from '../../models/branch.models';
import { AddBranchModalComponent } from './add-branch-modal.component';
import { ColDef, ValueGetterParams, ICellRendererParams, GridOptions } from 'ag-grid-community';

@Component({
  selector: 'app-branches',
  templateUrl: './branches.page.html',
  styleUrls: ['./branches.page.scss'],
})
export class BranchesComponent implements OnInit, ViewWillEnter {
  branches: Branch[] = [];
  branchForm: FormGroup;
  showAddForm: boolean = false;
  isEditing: boolean = false;
  editingBranchId: number | null = null;
  activeMenu: string = 'All Branches';
  isLoading: boolean = false;
  selectedBranch: Branch | null = null;

  // AG Grid configuration
  rowData: Branch[] = [];
  columnDefs: ColDef[] = [
    { field: 'id', headerName: 'ID', width: 80, sortable: true, filter: true },
    { field: 'name', headerName: 'Name', sortable: true, filter: true, flex: 1 },
    { field: 'city', headerName: 'City', sortable: true, filter: true, width: 150 },
    { field: 'state', headerName: 'State', sortable: true, filter: true, width: 120 },
    { headerName: 'Address', valueGetter: (params: ValueGetterParams<Branch>) => {
        const a1 = params.data?.address1 || '';
        const a2 = params.data?.address2 || '';
        return [a1, a2].filter(Boolean).join(' ');
      }, sortable: true, filter: true, flex: 1 },
    { field: 'country', headerName: 'Country', sortable: true, filter: true, width: 120 },
    { field: 'zipCode', headerName: 'Zip', sortable: true, filter: true, width: 120 },
    { field: 'phoneNumber', headerName: 'Phone', sortable: true, filter: true, width: 140 },
    {
      headerName: 'Actions',
      field: 'actions',
      width: 160,
      cellRenderer: (params: ICellRendererParams<Branch>) => {
        const container = document.createElement('div');
        container.className = 'actions-cell';
        container.innerHTML = `
          <button class="ag-btn ag-edit">Edit</button>
          <button class="ag-btn ag-delete">Delete</button>
        `;
        const editBtn = container.querySelector('.ag-edit');
        const delBtn = container.querySelector('.ag-delete');
        if (editBtn) editBtn.addEventListener('click', () => params.context.componentParent.editBranch(params.data));
        if (delBtn) delBtn.addEventListener('click', () => params.context.componentParent.deleteBranch(params.data));
        return container;
      }
    }
  ];
  defaultColDef: ColDef = { 
    resizable: true, 
    sortable: true, 
    filter: true 
  };

  constructor(
    private formBuilder: FormBuilder,
    private branchService: BranchService,
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private modalController: ModalController,
    private alertController: AlertController
  ) {
    this.branchForm = this.formBuilder.group({
      name: [''],
      code: [''],
      address: [''],
      city: [''],
      state: [''],
      phone: [''],
      email: ['']
    });

    // Grid options with context so cell renderers can call component methods
    this.gridOptions = {
      context: { componentParent: this }
    };
  }

  gridOptions: GridOptions;

  ngOnInit(): void {
    // Check authentication
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
  }

  ionViewWillEnter(): void {
    // Reload branches when page becomes active
    if (this.authService.isAuthenticated()) {
      this.loadBranches();
    }
  }

  async loadBranches(forceRefresh: boolean = false): Promise<void> {
    // First, try to get branches from login response
    const branchesFromLogin = this.authService.getBranchesFromLogin();

    // If we have branches from login and not forcing refresh, use them
    if (!forceRefresh && branchesFromLogin && branchesFromLogin.length > 0) {
      const normalized = this.normalizeBranches(branchesFromLogin);
      this.branches = normalized;
      this.rowData = normalized;
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Loading branches...',
      spinner: 'crescent'
    });
    await loading.present();

    this.branchService.getBranches().subscribe({
      next: (branches) => {
        loading.dismiss();
        this.isLoading = false;
        const normalized = this.normalizeBranches(branches);
        this.branches = normalized;
        this.rowData = normalized;
      },
      error: (_error) => {
        // Try alternative endpoint
        this.branchService.getBranchesList().subscribe({
          next: (branches) => {
            loading.dismiss();
            this.isLoading = false;
            const normalized = this.normalizeBranches(branches);
            this.branches = normalized;
            this.rowData = normalized;
          },
          error: (err) => {
            loading.dismiss();
            this.isLoading = false;
            this.branches = [];
            this.rowData = [];
            console.error('Error loading branches:', err);
            if (err.status !== 404) {
              this.showToast('Error loading branches: ' + (err.error?.message || err.message || 'Unknown error'), 'danger');
            }
          }
        });
      }
    });
  }

  private normalizeBranches(raw: Branch[] | { data?: Branch[]; items?: Branch[]; rows?: Branch[]; branches?: Branch[]; value?: Branch[]; result?: Branch[] } | Branch): Branch[] {
    if (!raw) return [];

    // Extract array from different response formats
    let list: Branch[];
    if (Array.isArray(raw)) {
      list = raw;
    } else {
      const response = raw as { data?: Branch[]; items?: Branch[]; rows?: Branch[]; branches?: Branch[]; value?: Branch[]; result?: Branch[] };
      if (response.data && Array.isArray(response.data)) list = response.data;
      else if (response.items && Array.isArray(response.items)) list = response.items;
      else if (response.rows && Array.isArray(response.rows)) list = response.rows;
      else if (response.branches && Array.isArray(response.branches)) list = response.branches;
      else if (response.value && Array.isArray(response.value)) list = response.value;
      else if (response.result && Array.isArray(response.result)) list = response.result;
      else list = [raw as Branch];
    }

    // Map to ensure all Branch DTO properties are present
    return list.map((branch: Branch) => ({
      id: branch.id ?? 0,
      name: branch.name ?? '',
      address1: branch.address1 ?? '',
      address2: branch.address2 ?? '',
      city: branch.city ?? '',
      state: branch.state ?? '',
      country: branch.country ?? '',
      zipCode: branch.zipCode ?? '',
      phoneNumber: branch.phoneNumber ?? '',
      orgId: branch.orgId ?? 0
    }));
  }

  async toggleAddForm(): Promise<void> {
    if (this.showAddForm) {
      // Close modal if already open
      const modal = await this.modalController.getTop();
      if (modal) {
        await this.modalController.dismiss();
      }
      this.showAddForm = false;
      this.resetForm();
    } else {
      // Open modal
      this.showAddForm = true;
      await this.openAddBranchModal();
    }
  }

  async openAddBranchModal(): Promise<void> {
    const modal = await this.modalController.create({
      component: AddBranchModalComponent,
      componentProps: {
        isEditing: this.isEditing,
        editingBranchId: this.editingBranchId
      },
      cssClass: 'add-branch-modal'
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data && data.success) {
      // Refresh branches list after successful save (force API fetch)
      this.loadBranches(true);
    }
    this.showAddForm = false;
    this.resetForm();
  }

  editBranch(branch: Branch): void {
    this.isEditing = true;
    this.editingBranchId = branch.id;
    this.openAddBranchModal();
  }

  async deleteBranch(branch: Branch): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Confirm delete',
      message: `Are you sure you want to delete branch "${branch.name}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          handler: async () => {
            const loading = await this.loadingController.create({ message: 'Deleting...', spinner: 'crescent' });
            await loading.present();
            this.branchService.deleteBranch(branch.id).subscribe({
              next: async () => {
                await loading.dismiss();
                this.showToast('Branch deleted', 'success');
                this.loadBranches(true);
              },
              error: async (err) => {
                await loading.dismiss();
                console.error('Delete error', err);
                this.showToast('Failed to delete branch', 'danger');
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  resetForm(): void {
    this.branchForm.reset();
    this.isEditing = false;
    this.editingBranchId = null;
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

  onBranchChange(branch: Branch): void {
    this.selectedBranch = branch;
  }
}

