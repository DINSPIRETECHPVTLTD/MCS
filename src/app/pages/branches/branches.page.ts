import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController, ViewWillEnter, ModalController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { UserContextService } from '../../services/user-context.service';
import { BranchService, Branch } from '../../services/branch.service';
import { AddBranchModalComponent } from './add-branch-modal.component';

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

  async loadBranches(): Promise<void> {
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
        this.branches = branches || [];
        console.log('Branches loaded:', this.branches.length);
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
            this.branches = branches || [];
            console.log('Branches loaded from alternative endpoint:', this.branches.length);
          },
          error: (err) => {
            loading.dismiss();
            this.isLoading = false;
            this.branches = [];
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
      // Refresh branches list after successful save
      this.loadBranches();
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

