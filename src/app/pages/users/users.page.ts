import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController, ViewWillEnter, ModalController } from '@ionic/angular';
import { UserService, User, CreateUserRequest } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { UserContextService } from '../../services/user-context.service';
import { BranchService, Branch } from '../../services/branch.service';
import { AddUserModalComponent } from './add-user-modal.component';

@Component({
  selector: 'app-users',
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
})
export class UsersPage implements OnInit, ViewWillEnter {
  users: User[] = [];
  userForm: FormGroup;
  showAddForm: boolean = false;
  isEditing: boolean = false;
  editingUserId: number | null = null;
  activeMenu: string = 'All Users';
  isLoading: boolean = false;

  constructor(
    private formBuilder: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private userContext: UserContextService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private modalController: ModalController
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
        console.log('Users loaded:', this.users.length);
        if (this.users.length === 0) {
          console.log('No users found - array is empty');
        }
      },
      error: (error) => {
        loading.dismiss();
        this.isLoading = false;
        this.users = []; // Ensure users array is initialized even on error
        console.error('Error loading users:', error);
        // Only show toast for actual errors, not 404s which might be expected
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
}
