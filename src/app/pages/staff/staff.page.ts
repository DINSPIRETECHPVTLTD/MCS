import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController, ViewWillEnter, ModalController, AlertController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { UserContextService } from '../../services/user-context.service';
import { UserService } from '../../services/user.service';
import { BranchService } from '../../services/branch.service';
import { User } from '../../models/user.models';
import { Branch } from '../../models/branch.models';
import { AddStaffModalComponent } from './add-staff-modal.component';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';

@Component({
  selector: 'app-staff',
  templateUrl: './staff.page.html',
  styleUrls: ['./staff.page.scss']
})
export class StaffComponent implements OnInit, ViewWillEnter {
  staff: User[] = [];
  displayedStaff: User[] = [];
  rowData: User[] = [];
  columnDefs: ColDef[] = [];
  defaultColDef: ColDef = { sortable: true, filter: true, resizable: true };
  pagination: boolean = true;
  paginationPageSize: number = 10;
  staffForm: FormGroup;
  showAddForm: boolean = false;
  isEditing: boolean = false;
  editingStaffId: number | null = null;
  activeMenu: string = 'Staff';
  isLoading: boolean = false;
  selectedBranch: Branch | null = null;
  private gridApi?: GridApi;
  gridOptions: any;
  // track editing state per-row
  editingRowIds: Set<number> = new Set<number>();
  originalRowData: Map<number, any> = new Map<number, any>();

  constructor(
    private formBuilder: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private userContext: UserContextService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private modalController: ModalController,
    private alertController: AlertController,
    private branchService: BranchService
  ) {
    this.staffForm = this.formBuilder.group({
      firstName: [''],
      lastName: [''],
      email: [''],
      phoneNumber: [''],
      role: ['']
    });
    // Grid options with context so cell renderers can call component methods
    this.gridOptions = { context: { componentParent: this } } as any;
  }

  // simple client-side filters
  filters: any = {
    id: '',
    name: '',
    city: '',
    state: '',
    address: '',
    country: '',
    zip: '',
    phone: '',
    role: ''
  };

  ngOnInit(): void {
    // Check authentication
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    
    // Load selected branch from localStorage or user context
    this.loadSelectedBranch();

    // grid options with row id resolver and context
    this.gridOptions = {
      context: { componentParent: this },
      getRowNodeId: (data: any) => data.id?.toString()
    } as any;

    // configure AG Grid columns to match requested layout (ID, Name, City, State, Address, Country, Zip, Phone)
    this.columnDefs = [
      { headerName: 'ID', field: 'id', width: 80, editable: false, filter: 'agNumberColumnFilter' },
      {
        headerName: 'Name',
        valueGetter: (p: any) => {
          const d = p.data || {};
          const parts = [d.firstName, d.middleName, d.lastName].filter((x: any) => !!x);
          return parts.join(' ');
        },
        field: 'name',
        flex: 1.6,
        editable: false,
        filter: 'agTextColumnFilter'
      },
      { headerName: 'City', field: 'city', editable: true, width: 140, filter: 'agTextColumnFilter' },
      { headerName: 'State', field: 'state', editable: true, width: 140, filter: 'agTextColumnFilter' },
      {
        headerName: 'Address',
        valueGetter: (p: any) => {
          const d = p.data || {};
          return [d.address1, d.address2].filter((x: any) => !!x).join(' ');
        },
        field: 'address',
        flex: 2,
        editable: false,
        filter: 'agTextColumnFilter'
      },
      { headerName: 'Country', field: 'country', editable: true, width: 140, filter: 'agTextColumnFilter', valueGetter: (p: any) => (p.data?.country || 'India') },
      { headerName: 'Zip', field: 'pinCode', editable: true, width: 120, filter: 'agTextColumnFilter' },
      { headerName: 'Phone', field: 'phoneNumber', editable: true, width: 140, filter: 'agTextColumnFilter' },
      // keep actions column (edit/delete/save) at end
      {
        headerName: 'Actions', field: 'actions', width: 160, cellRenderer: (params: any) => {
          const id = params.data?.id as number | undefined;
          const container = document.createElement('div');
          container.className = 'actions-cell';
          if (id && this.editingRowIds.has(id)) {
            container.innerHTML = `
              <button class="ag-btn ag-save">Save</button>
              <button class="ag-btn ag-cancel">Cancel</button>
            `;
            const saveBtn = container.querySelector('.ag-save');
            const cancelBtn = container.querySelector('.ag-cancel');
            if (saveBtn) saveBtn.addEventListener('click', () => params.context.componentParent.saveRow(id, params.node));
            if (cancelBtn) cancelBtn.addEventListener('click', () => params.context.componentParent.cancelEdit(id, params.node));
          } else {
            container.innerHTML = `
              <button class="ag-btn ag-edit">Edit</button>
            `;
            const editBtn = container.querySelector('.ag-edit');
            if (editBtn) editBtn.addEventListener('click', () => params.context.componentParent.startEdit(id, params.node));
          }
          return container;
        }
      }
    ];
  }

  loadSelectedBranch(): void {
    // Try to get from localStorage first (set by header menu)
    const savedBranchId = localStorage.getItem('selected_branch_id');
    if (savedBranchId) {
      // First try to get branches from login response
      const branchesFromLogin = this.authService.getBranchesFromLogin();
      
      if (branchesFromLogin && branchesFromLogin.length > 0) {
        const branch = branchesFromLogin.find(b => b.id.toString() === savedBranchId);
        if (branch) {
          this.selectedBranch = branch;
          this.loadStaff(); // Reload staff for the selected branch
          return;
        }
      }
      
      // Fallback: Load branches from API
      this.branchService.getBranches().subscribe({
        next: (branches) => {
          const branch = branches.find(b => b.id.toString() === savedBranchId);
          if (branch) {
            this.selectedBranch = branch;
            this.loadStaff(); // Reload staff for the selected branch
          }
        },
        error: () => {
          // Fallback to user context branch
          const branchId = this.userContext.branchId;
          if (branchId) {
            this.selectedBranch = { id: branchId } as Branch;
          }
          this.loadStaff();
        }
      });
    } else {
      // Fallback to user context branch
      const branchId = this.userContext.branchId;
      if (branchId) {
        this.selectedBranch = { id: branchId } as Branch;
      }
      this.loadStaff();
    }
  }

  ionViewWillEnter(): void {
    // Reload staff when page becomes active
    if (this.authService.isAuthenticated()) {
      console.log('Loading staff on view enter');
      // Reload selected branch and then load staff
      this.loadSelectedBranch();
    }
  }

  async loadStaff(): Promise<void> {
    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Loading staff...',
      spinner: 'crescent'
    });
    await loading.present();

    // Load all users and filter for branch level staff
    this.userService.getUsers().subscribe({
      next: (users) => {
        loading.dismiss();
        this.isLoading = false;
        // Filter users: prefer branch-level staff but be permissive to surface data
        let filteredStaff = (users || []).filter(user => {
          const lvl = (user.level || '').toString().toLowerCase();
          const role = (user.role || '').toString().toLowerCase();
          // accept if level contains 'branch' OR role contains 'branch'/'staff' OR no level provided
          const levelMatch = !lvl || lvl.includes('branch');
          const roleMatch = !role || role.includes('branch') || role.includes('staff');
          return levelMatch && roleMatch;
        });
        
        // If a branch is selected, filter by branch ID
        if (this.selectedBranch?.id) {
          filteredStaff = filteredStaff.filter(user => 
            user.branchId === this.selectedBranch!.id || 
            user.branchId?.toString() === this.selectedBranch!.id.toString()
          );
        }

        // Apply role filter from the UI (if set)
        const selectedRole = this.staffForm.get('role')?.value;
        if (selectedRole) {
          const roleLower = selectedRole.toString().toLowerCase();
          filteredStaff = filteredStaff.filter(user => {
            if (!user.role) return false;
            return user.role.toString().toLowerCase() === roleLower;
          });
        }
        
        this.staff = filteredStaff;
        this.displayedStaff = [...this.staff];
        this.rowData = [...this.staff];
        if (this.gridApi) {
          this.gridApi.setGridOption('rowData', this.rowData);
          setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);
        }
        console.log('Staff loaded:', this.staff.length, 'for branch:', this.selectedBranch?.id);
        if (this.staff.length === 0) {
          console.log('No staff found - array is empty');
        }
      },
      error: (error) => {
        loading.dismiss();
        this.isLoading = false;
        this.staff = [];
        console.error('Error loading staff:', error);
        if (error.status !== 404) {
          this.showToast('Error loading staff: ' + (error.error?.message || error.message || 'Unknown error'), 'danger');
        } else {
          console.log('No users endpoint found or no staff exist yet');
        }
      }
    });
  }

    onFilterChange(key: string, value: string): void {
      this.filters[key] = (value || '').toString().trim();
      this.applyFilters();
    }

    applyFilters(): void {
      let list = [...this.staff];
      // id
      if (this.filters.id) {
        list = list.filter(s => (s.id?.toString() || '').includes(this.filters.id));
      }
      // name (first/middle/last)
      if (this.filters.name) {
        const v = this.filters.name.toLowerCase();
        list = list.filter(s => ((s.firstName||'') + ' ' + (s.middleName||'') + ' ' + (s.lastName||'')).toLowerCase().includes(v));
      }
      // city
      if (this.filters.city) {
        const v = this.filters.city.toLowerCase();
        list = list.filter(s => (s.city||'').toLowerCase().includes(v));
      }
      // state
      if (this.filters.state) {
        const v = this.filters.state.toLowerCase();
        list = list.filter(s => (s.state||'').toLowerCase().includes(v));
      }
      // address
      if (this.filters.address) {
        const v = this.filters.address.toLowerCase();
        list = list.filter(s => ((s.address1||'') + ' ' + (s.address2||'')).toLowerCase().includes(v));
      }
      // country
      if (this.filters.country) {
        const v = this.filters.country.toLowerCase();
        list = list.filter(s => ((s as any)['country']||'').toString().toLowerCase().includes(v));
      }
      // zip
      if (this.filters.zip) {
        list = list.filter(s => (s.pinCode||'').toString().includes(this.filters.zip));
      }
      // phone
      if (this.filters.phone) {
        list = list.filter(s => (s.phoneNumber||'').toString().includes(this.filters.phone));
      }
      // role
      if (this.filters.role) {
        const v = this.filters.role.toLowerCase();
        list = list.filter(s => (s.role||'').toLowerCase().includes(v));
      }

      this.displayedStaff = list;
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
      this.isEditing = false;
      this.editingStaffId = null;
      this.showAddForm = true;
      await this.openAddStaffModal();
    }
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    if (this.rowData && this.rowData.length > 0) {
      this.gridApi.setGridOption('rowData', this.rowData);
    }
    setTimeout(() => {
      this.gridApi?.sizeColumnsToFit();
    }, 100);
  }

  editStaff(member: User): void {
    if (!member || !member.id) return;
    this.isEditing = true;
    this.editingStaffId = member.id;
    this.showAddForm = true;
    // Open modal in edit mode
    this.openAddStaffModal();
  }

  // Begin inline edit for a row: save original data and enter edit mode
  startEdit(id: number | undefined, node: any): void {
    if (!id || !node) return;
    // preserve original data for possible cancel
    this.originalRowData.set(id, JSON.parse(JSON.stringify(node.data || {})));
    this.editingRowIds.add(id);
    // refresh the row so the Actions cell shows Save/Cancel
    try {
      if (this.gridApi) this.gridApi.refreshCells({ rowNodes: [node], force: true });
      // start editing the first editable column (firstName) if available
      if (this.gridApi && node.rowIndex != null) {
        this.gridApi.startEditingCell({ rowIndex: node.rowIndex, colKey: 'firstName' });
      }
    } catch (e) {
      console.warn('startEdit refresh failed', e);
    }
  }

  // Save edited row to backend and exit edit mode
  saveRow(id: number | undefined, node: any): void {
    if (!id || !node) return;
    const data = node.data;
    if (!data) {
      this.showToast('No data to save', 'warning');
      return;
    }

    // Build clean payload similar to modal to avoid sending unexpected fields
    const payload: any = {
      firstName: (data.firstName || '').toString().trim(),
      middleName: (data.middleName || '').toString().trim(),
      lastName: (data.lastName || '').toString().trim(),
      phoneNumber: (data.phoneNumber || '').toString().trim(),
      address1: (data.address1 || '').toString().trim(),
      address2: (data.address2 || '').toString().trim(),
      city: (data.city || '').toString().trim(),
      state: (data.state || '').toString().trim(),
      pinCode: (data.pinCode || data.pinCode || '').toString().trim(),
      email: (data.email || '').toString().trim(),
      role: data.role || 'Staff',
      organizationId: data.organizationId || this.userContext.organizationId || 0,
      branchId: data.branchId || this.selectedBranch?.id || this.userContext.branchId || null
    };

    (async () => {
      const loading = await this.loadingController.create({ message: 'Saving changes...', spinner: 'crescent' });
      await loading.present();
      this.userService.updateUser(id, payload).subscribe({
        next: async (res) => {
          await loading.dismiss();
          this.showToast('Changes saved', 'success');
          this.editingRowIds.delete(id);
          this.originalRowData.delete(id);
          // update internal rowData and refresh
          const idx = this.rowData.findIndex(r => r.id === id);
          if (idx >= 0) this.rowData[idx] = { ...(res as User) };
          try {
            if (this.gridApi) {
              this.gridApi.stopEditing();
              (this.gridApi as any).refreshCells({ rowNodes: [node], force: true });
            }
          } catch (e) {
            console.warn('refresh after save failed', e);
          }
        },
        error: async (err) => {
          await loading.dismiss();
          console.error('Save row error', err);
          const msg = err?.error?.message || err?.message || 'Failed to save changes';
          this.showToast(msg, 'danger');
        }
      });
    })();
  }

  // Cancel inline edit and restore original data
  cancelEdit(id: number | undefined, node: any): void {
    if (!id || !node) return;
    const original = this.originalRowData.get(id);
    if (original) {
      try {
        node.setData(JSON.parse(JSON.stringify(original)));
      } catch (e) {
        // fallback: replace via gridApi
        const rowNode = this.gridApi?.getRowNode(id.toString());
        if (rowNode) rowNode.setData(original);
      }
      this.originalRowData.delete(id);
    }
    this.editingRowIds.delete(id);
    try {
      if (this.gridApi) this.gridApi.refreshCells({ rowNodes: [node], force: true });
      if (this.gridApi) this.gridApi.stopEditing();
    } catch (e) {
      console.warn('cancelEdit refresh failed', e);
    }
  }

  async deleteStaff(member: User): Promise<void> {
    if (!member || !member.id) return;
    const alert = await this.alertController.create({
      header: 'Confirm delete',
      message: `Are you sure you want to delete staff "${member.firstName} ${member.lastName}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingController.create({ message: 'Deleting staff...', spinner: 'crescent' });
            await loading.present();
            this.userService.deleteUser(member.id!).subscribe({
              next: async () => {
                await loading.dismiss();
                this.showToast('Staff deleted', 'success');
                this.loadStaff();
              },
              error: async (err) => {
                await loading.dismiss();
                console.error('Delete staff error', err);
                this.showToast('Failed to delete staff', 'danger');
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async openAddStaffModal(): Promise<void> {
    // Get selected branch ID
    const branchId = this.selectedBranch?.id || this.userContext.branchId;
    
    if (!branchId) {
      this.showToast('Please select a branch first', 'warning');
      this.showAddForm = false;
      return;
    }

    const modal = await this.modalController.create({
      component: AddStaffModalComponent,
      componentProps: {
        isEditing: this.isEditing,
        editingStaffId: this.editingStaffId,
        branchId: branchId
      },
      cssClass: 'add-staff-modal'
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data && data.success) {
      // Refresh staff list after successful save
      this.loadStaff();
    }
    this.showAddForm = false;
    this.resetForm();
  }

  resetForm(): void {
    this.staffForm.reset();
    this.isEditing = false;
    this.editingStaffId = null;
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
    // Handle branch change - update selected branch and reload staff
    console.log('Branch changed to:', branch);
    this.selectedBranch = branch;
    this.loadStaff(); // Reload staff for the new branch
  }
}

