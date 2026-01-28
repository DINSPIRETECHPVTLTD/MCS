  import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { CenterService } from 'src/app/services/center.service';
import { BranchService } from 'src/app/services/branch.service';
import { Branch } from 'src/app/models/branch.models';
import { UserContextService } from 'src/app/services/user-context.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-add-center-modal',
  templateUrl: './add-center-modal.component.html',
  styleUrls: ['./add-center-modal.component.scss']
})
export class AddCenterModalComponent implements OnInit, OnDestroy {
  branch: Branch | null = null;
  private branchSubscription?: Subscription;
  
  centerName: string = '';
  address: string = '';
  city: string = '';
  isSaving: boolean = false;
  formSubmitted: boolean = false;

  constructor(
    private modalController: ModalController,
    private centerService: CenterService,
    private branchService: BranchService,
    private userContext: UserContextService,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    // Subscribe to dynamic branch changes from header dropdown
    this.branchSubscription = this.branchService.selectedBranch$.subscribe(branch => {
      this.branch = branch;
    });
    
    // If no branch is set yet, load it
    if (!this.branch) {
      this.loadBranch();
    }
  }

  ngOnDestroy() {
    // Clean up subscription
    if (this.branchSubscription) {
      this.branchSubscription.unsubscribe();
    }
  }

  loadBranch(): void {
    // First try to get branch from UserContext (for branch users)
    const userBranchId = this.userContext.branchId;
    
    // Get selected branch from localStorage (for org users)
    const savedBranchId = localStorage.getItem('selected_branch_id');
    
    const branchId = userBranchId || savedBranchId;
    
    if (branchId) {
      // Try to get branch from login response first
      const branchesFromLogin = JSON.parse(localStorage.getItem('branches') || '[]');
      if (branchesFromLogin && branchesFromLogin.length > 0) {
        const foundBranch = branchesFromLogin.find((b: Branch) => 
          b.id === branchId || b.id.toString() === branchId.toString()
        );
        if (foundBranch) {
          this.branch = foundBranch;
          this.branchService.setSelectedBranch(foundBranch);
          return;
        }
      }
      
      // Fallback: fetch branches from API
      this.branchService.getBranches().subscribe({
        next: (branches) => {
          const foundBranch = branches.find(b => 
            b.id === branchId || b.id.toString() === branchId.toString()
          ) || null;
          this.branch = foundBranch;
          if (foundBranch) {
            this.branchService.setSelectedBranch(foundBranch);
          }
        },
        error: (error) => {
          console.error('Error loading branches:', error);
        }
      });
    }
  }

  closeModal() {
    this.modalController.dismiss();
  }

  async saveCenter(form: any) {
    this.formSubmitted = true;
    if (!this.centerName || !this.address || !this.city) {
      await this.showToast('Please fill all fields');
      return;
    }
    if (!this.branch?.id) {
      await this.showToast('Branch is required');
      return;
    }
    this.isSaving = true;
    const centerData = {
      Name: this.centerName,
      CenterAddress: this.address,
      City: this.city,
      BranchId: this.branch.id
    };
    this.centerService.addCenter(centerData).subscribe({
      next: async () => {
        this.isSaving = false;
        await this.showToast('Saved successfully');
        this.closeModal();
      },
      error: async () => {
        this.isSaving = false;
        await this.showToast('Data not saved');
      }
    });
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color: 'success',
      position: 'top'
    });
    toast.present();
  }
}
