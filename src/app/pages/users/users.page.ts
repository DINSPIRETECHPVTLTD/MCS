import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ToastController, ViewWillEnter, ModalController, AlertController } from '@ionic/angular';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { UserContextService } from '../../services/user-context.service';
import { User } from '../../models/user.models';
import { AddUserModalComponent } from './add-user-modal.component';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { agGridTheme } from '../../ag-grid-theme';
import { Branch } from 'src/app/models/branch.models';

@Component({
  selector: 'app-users',
  templateUrl: './users.page.html',
})
export class UsersComponent implements OnInit, ViewWillEnter {
  users: User[] = [];
  rowData: User[] = [];
  columnDefs: ColDef[] = [];
  defaultColDef: ColDef = { sortable: true, filter: true, resizable: true };
  pagination: boolean = true;
  paginationPageSize: number = 20;
  paginationPageSizeSelector: number[] = [10, 20, 50, 100];
  showAddForm: boolean = false;
  isEditing: boolean = false;
  editingUserId: number | null = null;
  activeMenu: string = 'All Users';
  isLoading: boolean = false;

  private gridApi?: GridApi;
  gridOptions = { theme: agGridTheme, context: { componentParent: this } };

  public constructor(
    private userService: UserService,
    private authService: AuthService,
    private userContext: UserContextService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private modalController: ModalController,
    private alertController: AlertController,
  ) {}

  ngOnInit(): void {
    // Check authentication
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    
    // set up grid columns
    this.columnDefs = [
      { headerName: 'User ID', field: 'id', width: 100, sortable: true, filter: true },
      { headerName: 'First Name', field: 'firstName', width: 150, sortable: true, filter: true },
      { headerName: 'Middle Name', field: 'middleName', width: 150, sortable: true, filter: true },
      { headerName: 'Last Name', field: 'lastName', width: 150, sortable: true, filter: true },
      { headerName: 'Email', field: 'email', width: 200, sortable: true, filter: true },
      { 
        headerName: 'Address', 
        width: 300,
        sortable: true, 
        filter: true,
        valueGetter: (params: any) => {
          const data = params.data;
          if (!data) return '';
          const parts = [];
          if (data.address1) parts.push(data.address1);
          if (data.address2) parts.push(data.address2);
          const cityStateZip = [];
          if (data.city) cityStateZip.push(data.city);
          const zipCode = data.zipCode || data.ZipCode;
          if (data.state && zipCode) {
            cityStateZip.push(`${data.state}-${zipCode}`);
          } else if (data.state) {
            cityStateZip.push(data.state);
          } else if (zipCode) {
            cityStateZip.push(zipCode);
          }
          if (cityStateZip.length > 0) parts.push(cityStateZip.join(', '));
          return parts.join(', ');
        }
      },
      { headerName: 'Actions',field: 'actions', width: 160,
        sortable: false,
        filter: false,
        resizable: false,
        cellRenderer: (params: any) => {
          const container = document.createElement('div');
          container.className = 'actions-cell';
          container.innerHTML = `
            <button class="ag-btn ag-edit" title="Edit" style="background: var(--ion-color-primary); color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer; font-weight: 500;">Edit</button>
            <button class="ag-btn ag-delete" title="Delete" style="background: var(--ion-color-danger); color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer; font-weight: 500; margin-left: 8px;">Delete</button>
          `;
          const editBtn = container.querySelector('.ag-edit');
          const deleteBtn = container.querySelector('.ag-delete');
          if (editBtn) editBtn.addEventListener('click', () => params.context.componentParent.editUser(params.data));
          if (deleteBtn) deleteBtn.addEventListener('click', () => params.context.componentParent.deleteUser(params.data));
          return container;
        }
      }
    ];
  }

  ionViewWillEnter(): void {
    // Reload users when page becomes active (Ionic lifecycle hook)
    if (this.authService.isAuthenticated()) {
      this.loadUsers();
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

        // Update grid if it's already initialized
        if (this.gridApi) {
          this.gridApi.setGridOption('rowData', this.rowData);
          setTimeout(() => {
            this.gridApi?.sizeColumnsToFit();
          }, 100);
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

  editUser(user: User): void {
    if (!user || !user.id) return;
    this.isEditing = true;
    this.editingUserId = user.id;
    this.showAddForm = true;
    this.openAddUserModal();
  }

  async deleteUser(user: User): Promise<void> {
    if (!user || !user.id) return;
    const alert = await this.alertController.create({
      header: 'Confirm delete',
      message: `Are you sure you want to delete user "${user.firstName} ${user.lastName}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingController.create({ message: 'Deleting user...', spinner: 'crescent' });
            await loading.present();
            this.userService.deleteUser(user.id!).subscribe({
              next: async () => {
                await loading.dismiss();
                this.showToast('User deleted successfully', 'success');
                this.loadUsers();
              },
              error: async (err) => {
                await loading.dismiss();
                console.error('Delete user error', err);
                this.showToast('Failed to delete user', 'danger');
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }
}
