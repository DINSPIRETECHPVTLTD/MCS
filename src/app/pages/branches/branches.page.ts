import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController, ViewWillEnter, ModalController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { UserContextService } from '../../services/user-context.service';
import { BranchService } from '../../services/branch.service';
import { Branch } from '../../models/branch.models';
import { AddBranchModalComponent } from './add-branch-modal.component';
import { ColDef } from 'ag-grid-community';

@Component({
  selector: 'app-branches',
  templateUrl: './branches.page.html',
  styleUrls: ['./branches.page.scss'],
})
export class BranchesPage implements OnInit, ViewWillEnter {
  branches: Branch[] = [];
  branchForm: FormGroup;
  showAddForm: boolean = false;
  isEditing: boolean = false;
  editingBranchId: number | null = null;
  activeMenu: string = 'All Branches';
  isLoading: boolean = false;

  // AG Grid configuration
  rowData: Branch[] = [];
  columnDefs: ColDef[] = [
    { field: 'id', headerName: 'ID', width: 80, sortable: true, filter: true },
    { field: 'name', headerName: 'Name', sortable: true, filter: true, flex: 1 },
    { field: 'city', headerName: 'City', sortable: true, filter: true, width: 150 },
    { field: 'state', headerName: 'State', sortable: true, filter: true, width: 120 },
    { headerName: 'Address', valueGetter: (params: any) => {
        const a1 = params.data?.address1 || params.data?.address || '';
        const a2 = params.data?.address2 || '';
        return [a1, a2].filter(Boolean).join(' ');
      }, sortable: true, filter: true, flex: 1 },
    { field: 'country', headerName: 'Country', sortable: true, filter: true, width: 120 },
    { field: 'zipCode', headerName: 'Zip', sortable: true, filter: true, width: 120 },
    { field: 'phoneNumber', headerName: 'Phone', sortable: true, filter: true, width: 140 }
  ];
  defaultColDef: ColDef = { 
    resizable: true, 
    sortable: true, 
    filter: true 
  };
  pagination: boolean = true;
  paginationPageSize: number = 10;

  constructor(
    private formBuilder: FormBuilder,
    private branchService: BranchService,
    private authService: AuthService,
    private userContext: UserContextService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private modalController: ModalController
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
  }

  ngOnInit(): void {
    console.log('BranchesPage ngOnInit called');
    // Check authentication
    if (!this.authService.isAuthenticated()) {
      console.log('Not authenticated, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }
  }

  ionViewWillEnter(): void {
    console.log('BranchesPage ionViewWillEnter called');
    // Reload branches when page becomes active
    if (this.authService.isAuthenticated()) {
      console.log('Loading branches on view enter');
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
      console.log('Loaded branches from login response:', branchesFromLogin.length);
      return;
    }
    
    // Fallback: Fetch branches from API if not available from login
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
        console.log('Branches loaded from API (normalized):', this.branches.length);
        if (this.branches.length === 0) {
          console.log('No branches found - array is empty');
        }
      },
      error: (error) => {
        // Try alternative endpoint
        this.branchService.getBranchesList().subscribe({
          next: (branches) => {
            loading.dismiss();
            this.isLoading = false;
            const normalized = this.normalizeBranches(branches);
            this.branches = normalized;
            this.rowData = normalized;
            console.log('Branches loaded from alternative endpoint (normalized):', this.branches.length);
          },
          error: (err) => {
            loading.dismiss();
            this.isLoading = false;
            this.branches = [];
            this.rowData = [];
            console.error('Error loading branches:', err);
            if (err.status !== 404) {
              this.showToast('Error loading branches: ' + (err.error?.message || err.message || 'Unknown error'), 'danger');
            } else {
              console.log('No branches endpoint found or no branches exist yet');
            }
          }
        });
      }
    });
  }

  private normalizeBranches(raw: any): Branch[] {
    if (!raw) return [];

    let list: any[] = raw;
    if (!Array.isArray(raw)) {
      if (raw.data && Array.isArray(raw.data)) list = raw.data;
      else if (raw.items && Array.isArray(raw.items)) list = raw.items;
      else if (raw.rows && Array.isArray(raw.rows)) list = raw.rows;
      else if (raw.branches && Array.isArray(raw.branches)) list = raw.branches;
      else if (raw.value && Array.isArray(raw.value)) list = raw.value;
      else if (raw.result && Array.isArray(raw.result)) list = raw.result;
      else list = [raw];
    }

    return list.map((b: any) => {
      const address1 = b.address1 ?? b.addressLine1 ?? '';
      const address2 = b.address2 ?? b.addressLine2 ?? '';
      const combined = b.address ?? [address1, address2].filter(Boolean).join(' ');
      return {
        id: b.id ?? b.branchId ?? 0,
        name: b.name ?? b.branchName ?? '',
        address1: address1,
        address2: address2,
        address: combined,
        city: b.city ?? b.town ?? '',
        state: b.state ?? '',
        country: b.country ?? b.countryName ?? '',
        zipCode: b.zipCode ?? b.postalCode ?? b.zip ?? '',
        phoneNumber: b.phoneNumber ?? b.phone ?? b.contact ?? '',
        ...b
      } as Branch;
    });
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
    // Handle branch change if needed
    console.log('Branch changed to:', branch);
  }
}

