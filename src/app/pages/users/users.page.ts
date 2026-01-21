import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController, ViewWillEnter, ModalController } from '@ionic/angular';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { UserContextService } from '../../services/user-context.service';
import { User, CreateUserRequest } from '../../models/user.models';
import { Branch } from '../../models/branch.models';
import { AddUserModalComponent } from './add-user-modal.component';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';

@Component({
  selector: 'app-users',
  templateUrl: './users.page.html',
})
export class UsersPage implements OnInit, ViewWillEnter {
  users: User[] = [];
  rowData: User[] = []; // <-- added
  columnDefs: ColDef[] = [];
  defaultColDef: ColDef = { sortable: true, filter: true, resizable: true };
  pagination: boolean = true;
  paginationPageSize: number = 10;
  userForm: FormGroup;
  showAddForm: boolean = false;
  isEditing: boolean = false;
  editingUserId: number | null = null;
  activeMenu: string = 'All Users';
  isLoading: boolean = false;

  private gridApi?: GridApi;

  public constructor(
    private formBuilder: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private userContext: UserContextService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private modalController: ModalController,
  ) {
    this.userForm = this.formBuilder.group({
      firstName: ['', [Validators.required]],
      middleName: [''],
      lastName: ['', [Validators.required]],
      phoneNumber: ['', [Validators.pattern(/^[0-9]{10}$/)]],
      address1: [''],
      address2: [''],
      city: [''],
      state: [''],
      pinCode: ['', [Validators.pattern(/^[0-9]{6}$/)]],
      email: ['', [Validators.email]],
      level: ['Org'],
      role: ['Owner'],
      organizationId: [0]
    });
  }

  ngOnInit(): void {
    console.log('UsersPage ngOnInit called');
    // Check authentication
    if (!this.authService.isAuthenticated()) {
      console.log('Not authenticated, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }
    
    console.log('Setting organization ID');
    this.setOrganizationId();
    // set up grid columns
    this.columnDefs = [
      { headerName: 'First Name', field: 'firstName', flex: 1 },
      { headerName: 'Last Name', field: 'lastName', flex: 1 },
      { headerName: 'Email', field: 'email', flex: 1.5 },
      { headerName: 'Actions',field: 'actions', flex: 0.8,
        sortable: false,
        filter: false,
        resizable: false,
        cellRenderer: (params: any) => {
          return `
            <div class="action-buttons">
              <button class="ag-action ag-edit" title="Edit">Edit</button>
              <button class="ag-action ag-delete" title="Delete">Delete</button>
            </div>
          `;
        }
      }
    ];
  }

  ionViewWillEnter(): void {
    console.log('UsersPage ionViewWillEnter called');
    // Reload users when page becomes active (Ionic lifecycle hook)
    if (this.authService.isAuthenticated()) {
      console.log('Loading users on view enter');
      this.loadUsers();
    }
  }

  setOrganizationId(): void {
    // Use UserContext service to get organization ID
    const organizationId = this.userContext.organizationId;
    if (organizationId) {
      this.userForm.patchValue({
        organizationId: organizationId
      });
    }
  }

  async loadUsers(): Promise<void> {
    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Loading users...',
      spinner: 'crescent'
    });
    await loading.present();

    this.userService.getUsers().subscribe({
      next: (users) => {
        loading.dismiss();
        this.isLoading = false;
        this.users = users || [];
        this.rowData = [...this.users]; // Create new array reference for change detection
        console.log('Users loaded:', this.users);
        console.log('RowData set:', this.rowData);

        // Update grid if it's already initialized
        if (this.gridApi) {
          this.gridApi.setGridOption('rowData', this.rowData);
          setTimeout(() => {
            this.gridApi?.sizeColumnsToFit();
          }, 100);
        }

        if (this.users.length === 0) {
          console.log('No users found - array is empty');
        }
      },
      error: (error) => {
        loading.dismiss();
        this.isLoading = false;
        this.users = [];
        this.rowData = []; // <-- clear rowData on error
        console.error('Error loading users:', error);
        if (error.status !== 404) {
          this.showToast('Error loading users: ' + (error.error?.message || error.message || 'Unknown error'), 'danger');
        } else {
          console.log('No users endpoint found or no users exist yet');
        }
      }
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
      await this.openAddUserModal();
    }
  }

  async openAddUserModal(): Promise<void> {
    const modal = await this.modalController.create({
      component: AddUserModalComponent,
      componentProps: {
        isEditing: this.isEditing,
        editingUserId: this.editingUserId
      },
      cssClass: 'add-user-modal'
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data && data.success) {
      // Refresh users list after successful save
      this.loadUsers();
    }
    this.showAddForm = false;
    this.resetForm();
  }

  resetForm(): void {
    this.userForm.reset({
      level: 'Org',
      role: 'Owner',
      organizationId: this.userForm.value.organizationId || 0
    });
    this.isEditing = false;
    this.editingUserId = null;
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

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    // Set rowData if it's already loaded
    if (this.rowData && this.rowData.length > 0) {
      this.gridApi.setGridOption('rowData', this.rowData);
    }
    // Auto-size columns to fit
    setTimeout(() => {
      this.gridApi?.sizeColumnsToFit();
    }, 100);
  }
}
