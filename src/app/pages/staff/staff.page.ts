import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController, ViewWillEnter, ModalController, AlertController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { UserContextService } from '../../services/user-context.service';
import { UserService } from '../../services/user.service';
import { BranchService } from '../../services/branch.service';
import { User, CreateUserRequest } from '../../models/user.models';
import { Branch } from '../../models/branch.models';
import { AddStaffModalComponent } from './add-staff-modal.component';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { agGridTheme } from '../../ag-grid-theme';
import { POCData } from '../branch-dashboard/branch-dashboard.page';

@Component({
  selector: 'app-staff',
  templateUrl: './staff.page.html'
})
export class StaffComponent implements OnInit, ViewWillEnter {
  staff: User[] = [];
  displayedStaff: User[] = [];
  rowData: User[] = [];
  columnDefs: ColDef[] = [];
  defaultColDef: ColDef = { sortable: true, filter: true, resizable: true };
  pagination: boolean = true;
  paginationPageSize: number = 20;
  paginationPageSizeSelector: number[] = [10, 20, 50, 100];
  staffForm: FormGroup;
  showAddForm: boolean = false;
  isEditing: boolean = false;
  editingStaffId: number | null = null;
  activeMenu: string = 'Staff';
  isLoading: boolean = false;
  selectedBranch: Branch | null = null;
  private gridApi?: any;
  gridOptions: any;
  // track editing state per-row
  editingRowIds: Set<number> = new Set<number>();
  originalRowData: Map<number, POCData> = new Map<number, POCData>();

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
    this.gridOptions = { theme: agGridTheme, context: { componentParent: this } } as any;
  }

  // Open reset password prompt and update password
  async resetPassword(member: User): Promise<void> {
    if (!member || !member.id) return;

    const alert = await this.alertController.create({
      header: 'Reset Password',
      inputs: [
        {
          name: 'newPassword',
          type: 'password',
          placeholder: 'New Password'
        },
        {
          name: 'confirmPassword',
          type: 'password',
          placeholder: 'Confirm Password'
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Submit',
          handler: async (data: any) => {
            const newPwd = (data?.newPassword || '').toString();
            const confirm = (data?.confirmPassword || '').toString();

            // Basic validation: non-empty, match, and password policy
            if (!newPwd || !confirm) {
              this.showToast('Please fill both password fields', 'warning');
              return false; // prevent dismiss
            }
            if (newPwd !== confirm) {
              this.showToast('Passwords do not match', 'danger');
              return false;
            }

            // Password policy: at least one uppercase, one lowercase or digit, one digit, one special char, min length 8
            const policy = /(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}/;
            if (!policy.test(newPwd)) {
              this.showToast('Password must include uppercase letters, numbers and special characters (min 8 chars)', 'danger');
              return false;
            }

            const loading = await this.loadingController.create({ message: 'Resetting password...', spinner: 'crescent' });
            await loading.present();

            const payload: Partial<CreateUserRequest> = { password: newPwd } as Partial<CreateUserRequest>;
            this.userService.updateUser(member.id!, payload).subscribe({
              next: async () => {
                await loading.dismiss();
                this.showToast('Password Reset Successfully.', 'success');
              },
              error: async (err) => {
                await loading.dismiss();
                console.error('Password reset error', err);
                this.showToast('Failed to reset password', 'danger');
              }
            });

            return true; // allow dismiss
          }
        }
      ]
    });

    await alert.present();
  }

  // simple client-side filters
  filters: any = {
    id: '',
    fullname: '',
    address: '',
    phone: '',
    role: ''
  };

  ngOnInit(): void {
    // Check authentication
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    
    // Grid options and column definitions setup (no data loading here)
    // Data loading happens in ionViewWillEnter via loadSelectedBranch
    this.gridOptions = {
      theme: agGridTheme,
      context: { componentParent: this },
      getRowNodeId: (data: any) => data.id?.toString()
    } as any;

    // configure AG Grid columns to match requested layout (ID, Name, City, State, Address, Zip, Phone)
    this.columnDefs = [
      { headerName: 'ID', field: 'id', width: 80, editable: false, filter: 'agNumberColumnFilter' },
      {
        headerName: 'Full Name',
        valueGetter: (p: any) => {
          const d = p.data || {};
          const parts = [d.firstName, d.lastName].filter((x: any) => !!x);
          return parts.join(' ');
        },
        field: 'fullName',
        flex: 1.6,
        editable: false,
        filter: 'agTextColumnFilter'
      },
      {
        headerName: 'Address',
        valueGetter: (p: any) => {
          const d = p.data || {};
          const parts = [d.address1, d.address2, d.city, d.state, d.zipCode].filter((x: any) => !!x);
          return parts.join(', ');
        },
        field: 'address',
        flex: 2.5,
        editable: false,
        filter: 'agTextColumnFilter'
      },
      { headerName: 'Phone', field: 'phoneNumber', editable: false, width: 140, filter: 'agTextColumnFilter' },
      // keep actions column (edit/delete/reset) at end
      {
        headerName: 'Actions', field: 'actions', width: 300, cellRenderer: (params: any) => {
          const container = document.createElement('div');
          container.className = 'actions-cell';
          container.innerHTML = `
            <button class="ag-btn ag-edit">Edit</button>
            <button class="ag-btn ag-reset">Reset Password</button>
            <button class="ag-btn ag-delete">Inactive</button>
          `;
          const editBtn = container.querySelector('.ag-edit');
          const resetBtn = container.querySelector('.ag-reset');
          const deleteBtn = container.querySelector('.ag-delete');
          if (editBtn) editBtn.addEventListener('click', () => params.context.componentParent.editStaff(params.data));
          if (resetBtn) resetBtn.addEventListener('click', () => params.context.componentParent.resetPassword(params.data));
          if (deleteBtn) deleteBtn.addEventListener('click', () => params.context.componentParent.deleteStaff(params.data));
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
          this.loadStaff(); // Found in cache, load once and return
          return;
        }
      }
      
      // Cache miss or no branches from login: try API (async)
      this.branchService.getBranches().subscribe({
        next: (branches) => {
          const branch = branches.find(b => b.id.toString() === savedBranchId);
          if (branch) {
            this.selectedBranch = branch;
          } else {
            // Fallback to user context if saved branch not found
            const branchId = this.userContext.branchId;
            if (branchId) {
              this.selectedBranch = { id: branchId } as Branch;
            }
          }
          this.loadStaff();
        },
        error: () => {
          // API failed, use user context branch
          const branchId = this.userContext.branchId;
          if (branchId) {
            this.selectedBranch = { id: branchId } as Branch;
          }
          this.loadStaff();
        }
      });
    } else {
      // No saved branch, use user context
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
          // Exclude investor users
          if (lvl.includes('Investor') || role.includes('Investor')) {
            return false;
          }
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
          this.gridApi.setRowData(this.rowData);
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
      // full name (first/last)
      if (this.filters.fullname) {
        const v = this.filters.fullname.toLowerCase();
        list = list.filter(s => ((s.firstName||'') + ' ' + (s.lastName||'')).toLowerCase().includes(v));
      }
      // address (includes address1, address2, city, state, zipCode)
      if (this.filters.address) {
        const v = this.filters.address.toLowerCase();
        list = list.filter(s => ((s.address1||'') + ' ' + (s.address2||'') + ' ' + (s.city||'') + ' ' + (s.state||'') + ' ' + (s.zipCode||'')).toLowerCase().includes(v));
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
      this.gridApi.setRowData(this.rowData);
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
              this.gridApi.refreshCells({ rowNodes: [node], force: true });
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

  async deleteStaff(member: User): Promise<void> {
    if (!member || !member.id) return;
    const alert = await this.alertController.create({
      header: 'Confirm Inactive',
      message: `Are you sure you want to permanently Inactive staff "${member.firstName} ${member.lastName}"? This action cannot be undone.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Inactive',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingController.create({ message: 'Deleting staff...', spinner: 'crescent' });
            await loading.present();
            this.userService.deleteUser(member.id!).subscribe({
              next: async () => {
                await loading.dismiss();
                this.showToast('Staff deleted successfully', 'success');
                // remove from local arrays and update grid
                const idx = this.rowData.findIndex(r => r.id === member.id);
                if (idx >= 0) this.rowData.splice(idx, 1);
                this.staff = [...this.rowData];
                this.displayedStaff = [...this.rowData];
                if (this.gridApi) {
                  try {
                    if (typeof this.gridApi.applyTransaction === 'function') {
                      this.gridApi.applyTransaction({ remove: [member] });
                    } else {
                      this.gridApi.setRowData(this.rowData);
                    }
                  } catch (e) {
                    this.gridApi.setRowData(this.rowData);
                  }
                }
              },
              error: async (err) => {
                await loading.dismiss();
                console.error('Delete staff error', err);
                const msg = err?.error?.message || err?.message || 'Failed to delete staff';
                this.showToast(msg, 'danger');
              }
            });
          }
        }
      ]
    });
    await alert.present();
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
      const returned = data.staff as User | undefined;
      if (returned && returned.id) {
        // normalize returned object to ensure branch/organization are present
        const newUser: User = {
          ...(returned as User),
          branchId: returned.branchId ?? this.selectedBranch?.id ?? this.userContext.branchId ?? null,
          organizationId: returned.organizationId ?? this.userContext.organizationId ?? 0
        } as User;

        // update existing row in-place if present
        const idx = this.rowData.findIndex(r => r.id === newUser.id);
        if (idx >= 0) {
          this.rowData[idx] = { ...newUser };
          // keep arrays in sync
          this.staff = [...this.rowData];
          this.displayedStaff = [...this.rowData];
          if (this.gridApi) {
            const rowNode = this.gridApi.getRowNode(newUser.id!.toString());
            if (rowNode) rowNode.setData(newUser);
            else this.gridApi.setRowData(this.rowData);
          }
        } else {
          // new staff created - insert at top
          this.rowData.unshift(newUser);
          this.staff = [...this.rowData];
          this.displayedStaff = [...this.rowData];
          if (this.gridApi) {
            // Use transaction add for better UX when AG Grid is available
            try {
              if (typeof this.gridApi.applyTransaction === 'function') {
                this.gridApi.applyTransaction({ add: [newUser], addIndex: 0 });
              } else {
                this.gridApi.setRowData(this.rowData);
              }
            } catch (e) {
              this.gridApi.setRowData(this.rowData);
            }
          }
        }

        setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);
      } else {
        // fallback to full reload
        this.loadStaff();
      }
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
    this.selectedBranch = branch;
    this.loadStaff(); // Reload staff for the new branch
  }
}

