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
import { __param } from 'tslib';

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
      { headerName: 'Full Name', field: 'fullName', width: 150, sortable: true, filter: true, 
        valueGetter:(params: any) => {
          const data = params.data;
          if(!data) return '';
          const parts = [];
          if(data.firstName) parts.push(data.firstName);
          if(data.lastName) parts.push(data.lastName);
            return parts.join(' ')        
          }
      },
      { headerName: 'Email', field: 'email', width: 200, sortable: true, filter: true },
      { headerName: 'Role', field: 'role', width: 150, sortable: true, filter: true },
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
      { headerName: 'Actions',field: 'actions', width: 380,
        sortable: false,
        filter: false,
        resizable: false,
        cellRenderer: (params: any) => {
          const container = document.createElement('div');
          container.className = 'actions-cell';
          container.style.display = 'flex';
          container.style.gap = '6px';
          container.style.alignItems = 'center';
          container.innerHTML = `
            <button class="ag-btn ag-edit" title="Edit" style="background: var(--ion-color-primary); color: white; border: none; padding: 4px 10px; border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: 500; white-space: nowrap;">Edit</button>
            <button class="ag-btn ag-reset-password" title="Reset Password" style="background: #4a90e2; color: white; border: none; padding: 4px 10px; border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: 500; white-space: nowrap;">Reset Password</button>
            <button class="ag-btn ag-Inactive" title="Inactive" style="background: var(--ion-color-danger); color: white; border: none; padding: 4px 10px; border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: 500; white-space: nowrap;">Inactive</button>
          `;
          const editBtn = container.querySelector('.ag-edit');
          const resetBtn = container.querySelector('.ag-reset-password');
          const deleteBtn = container.querySelector('.ag-Inactive');
          if (editBtn) editBtn.addEventListener('click', () => params.context.componentParent.editUser(params.data));
          if (resetBtn) resetBtn.addEventListener('click', () => params.context.componentParent.resetPassword(params.data));
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

  async openAddUserModal(): Promise<void> {
    const modal = await this.modalController.create({
      component: AddUserModalComponent,
      cssClass: 'add-user-modal'
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data && data.success) {
      // Refresh users list after successful save
      this.loadUsers();
    }
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

  async editUser(user: User): Promise<void> {
    if (!user || !user.id) return;
    const modal = await this.modalController.create({
      component: AddUserModalComponent,
      componentProps: {
        isEditing: true,
        editingUserId: user.id
      },
      cssClass: 'add-user-modal'
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data && data.success) {
      // Refresh users list after successful save
      this.loadUsers();
    }
  }

  async deleteUser(user: User): Promise<void> {
    if (!user || !user.id) return;
    const alert = await this.alertController.create({
      header: 'Confirm Inactivation',
      message: `Are you sure you want to inactivate user "${user.firstName} ${user.lastName}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Inactivate',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingController.create({ message: 'Inactivating user...', spinner: 'crescent' });
            await loading.present();
            this.userService.deleteUser(user.id!).subscribe({
              next: async () => {
                await loading.dismiss();
                this.showToast('User inactivated successfully', 'success');
                this.loadUsers();
              },
              error: async (err) => {
                await loading.dismiss();
                console.error('Inactivate user error', err);
                this.showToast('Failed to inactivate user', 'danger');
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  validatePassword(password: string): { valid: boolean; message: string } {
    if (!password) {
      return { valid: false, message: 'Password is required' };
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasAlphanumeric = /[a-zA-Z0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    const hasMinLength = password.length >= 6;

    const errors: string[] = [];

    if (!hasMinLength) {
      errors.push('at least 6 characters');
    }

    if (!hasAlphanumeric) {
      errors.push('alphanumeric characters');
    }

    if (!hasUpperCase) {
      errors.push('capital letters');
    }

    if (!hasSpecialChar) {
      errors.push('special characters');
    }

    if (errors.length > 0) {
      return {
        valid: false,
        message: `Password must include: ${errors.join(', ')}`
      };
    }

    return { valid: true, message: '' };
  }

  async resetPassword(user: User): Promise<void> {
    if (!user || !user.id) return;

    const alert = await this.alertController.create({
      header: 'Reset Password',
      message: `Reset password for ${user.firstName} ${user.lastName}`,
      inputs: [
        {
          name: 'newPassword',
          type: 'password',
          placeholder: 'New Password',
          attributes: { required: true }
        },
        {
          name: 'confirmPassword',
          type: 'password',
          placeholder: 'Confirm Password',
          attributes: { required: true }
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Submit',
          handler: async (data) => {
            const newPassword = data.newPassword?.trim();
            const confirmPassword = data.confirmPassword?.trim();

            if (!newPassword || !confirmPassword) {
              this.showToast('Please enter both password fields', 'danger');
              return false;
            }

            if (newPassword !== confirmPassword) {
              this.showToast('Passwords do not match', 'danger');
              return false;
            }

            const validation = this.validatePassword(newPassword);
            if (!validation.valid) {
              this.showToast(validation.message, 'danger');
              return false;
            }

            const loading = await this.loadingController.create({
              message: 'Resetting password',
              spinner: 'crescent'
            });
            await loading.present();

            this.userService.resetUserPassword(user.id!, newPassword).subscribe({
              next: async () => {
                await loading.dismiss();
                this.showToast('Password Reset Successfully.', 'success');
              },
              error: async (err) => {
                await loading.dismiss();
                console.error('Reset password error', err);
                const errorMessage = err.error?.message || 'Failed to reset password';
                this.showToast(errorMessage, 'danger');
              }
            });

            return true;
          }
        }
      ]
    });

    await alert.present();
  }
}
