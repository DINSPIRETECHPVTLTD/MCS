import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController, ViewWillEnter, ModalController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { UserContextService } from '../../services/user-context.service';
import { UserService, User } from '../../services/user.service';
import { BranchService, Branch } from '../../services/branch.service';
import { AddStaffModalComponent } from './add-staff-modal.component';

@Component({
  selector: 'app-staff',
  templateUrl: './staff.page.html',
  styleUrls: ['./staff.page.scss']
})
export class StaffPage implements OnInit, ViewWillEnter {
  staff: User[] = [];
  staffForm: FormGroup;
  showAddForm: boolean = false;
  isEditing: boolean = false;
  editingStaffId: number | null = null;
  activeMenu: string = 'Staff';
  isLoading: boolean = false;
  selectedBranch: Branch | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private userContext: UserContextService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private modalController: ModalController,
    private branchService: BranchService
  ) {
    this.staffForm = this.formBuilder.group({
      firstName: [''],
      lastName: [''],
      email: [''],
      phoneNumber: ['']
    });
  }

  ngOnInit(): void {
    console.log('StaffPage ngOnInit called');
    // Check authentication
    if (!this.authService.isAuthenticated()) {
      console.log('Not authenticated, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }
    
    // Load selected branch from localStorage or user context
    this.loadSelectedBranch();
  }

  loadSelectedBranch(): void {
    // Try to get from localStorage first (set by header menu)
    const savedBranchId = localStorage.getItem('selected_branch_id');
    if (savedBranchId) {
      // Load branches and find the selected one
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
    console.log('StaffPage ionViewWillEnter called');
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
        // Filter users with level='branch' or level='Branch' and matching branch ID
        let filteredStaff = (users || []).filter(user => 
          user.level?.toLowerCase() === 'branch' && 
          (user.role === 'BranchAdmin' || user.role === 'Staff')
        );
        
        // If a branch is selected, filter by branch ID
        if (this.selectedBranch?.id) {
          filteredStaff = filteredStaff.filter(user => 
            user.branchId === this.selectedBranch!.id || 
            user.branchId?.toString() === this.selectedBranch!.id.toString()
          );
        }
        
        this.staff = filteredStaff;
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
      await this.openAddStaffModal();
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

