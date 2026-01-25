import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, LoadingController, ToastController } from '@ionic/angular';
import { BranchService } from '../../services/branch.service';
import { CreateBranchRequest } from '../../models/branch.models';
import { UserContextService } from '../../services/user-context.service';
import { Subject, takeUntil } from 'rxjs';
import { Branch } from '../../models/branch.models';


@Component({
  selector: 'app-add-branch-modal',
  templateUrl: './add-branch-modal.component.html',
  styleUrls: ['./add-branch-modal.component.scss']
})
export class AddBranchModalComponent implements OnInit {
  @Input() isEditing: boolean = false;
  @Input() editingBranchId: number | null = null;
  branches: { id: number, name: string }[] = [];

  branchForm: FormGroup;
  submitted: boolean = false;

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private branchService: BranchService,
    private userContext: UserContextService,
    private loadingController: LoadingController,
    private toastController: ToastController
  )
  
  {
    this.branchForm = this.formBuilder.group({
  name: ['', [Validators.required]],
  code: [''],
  address: [''],
  city: [''],
  state: [''],
  phone: ['', [Validators.pattern(/^[0-9]{10}$/)]],
  email: ['', [Validators.email]],
  organizationId: [0],
  branchId: [null, [Validators.required]] // <-- Add this line for branch dropdown
    });
  }

ngOnInit(): void {
  const organizationId = this.userContext.organizationId;
  if (organizationId) {
    this.branchForm.patchValue({ organizationId });
  }

  // Load branches for dropdown
  this.branchService.getBranches().subscribe({
    next: (data) => {
      this.branches = data; // <-- branch array with only id & name
      console.log('Branches loaded:', this.branches); // Step 1 debug
    },
    error: (err) => console.error('Failed to load branches', err)
  });
}

  async onSubmit(): Promise<void> {
    this.submitted = true;
    
    // Mark all fields as touched to show validation errors
    Object.keys(this.branchForm.controls).forEach(key => {
      this.branchForm.get(key)?.markAsTouched();
    });

    if (this.branchForm.invalid) {
      this.showToast('Please fill in all required fields correctly', 'danger');
      return;
    }

    const loading = await this.loadingController.create({
      message: this.isEditing ? 'Updating branch...' : 'Creating branch...',
      spinner: 'crescent'
    });
    await loading.present();

    const branchData: CreateBranchRequest = {
      name: this.branchForm.value.name.trim(),
      code: this.branchForm.value.code?.trim() || '',
      address: this.branchForm.value.address?.trim() || '',
      city: this.branchForm.value.city?.trim() || '',
      state: this.branchForm.value.state?.trim() || '',
      phone: this.branchForm.value.phone?.trim() || '',
      email: this.branchForm.value.email?.trim() || '',
      organizationId: this.branchForm.value.organizationId
    };

    this.branchService.createBranch(branchData).subscribe({
      next: async (branch) => {
        await loading.dismiss();
        this.showToast(
          this.isEditing ? 'Branch updated successfully!' : 'Branch created successfully!', 
          'success'
        );
        // Close modal and return success
        await this.modalController.dismiss({ success: true, branch });
      },
      error: async (error) => {
        await loading.dismiss();
        const errorMessage = error.error?.message || error.message || 'Failed to create branch. Please try again.';
        this.showToast(errorMessage, 'danger');
        console.error('Error creating branch:', error);
      }
    });
  }

  async closeModal(): Promise<void> {
    await this.modalController.dismiss({ success: false });
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

  getFieldError(fieldName: string): string {
    const field = this.branchForm.get(fieldName);
    if (field && field.invalid && (field.touched || this.submitted)) {
      if (field.errors?.['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (field.errors?.['email']) {
        return 'Please enter a valid email address';
      }
      if (field.errors?.['pattern']) {
        if (fieldName === 'phone') {
          return 'Please enter a valid 10-digit phone number';
        }
      }
    }
    return '';
  }

  getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Branch name',
      code: 'Branch code',
      address: 'Address',
      city: 'City',
      state: 'State',
      phone: 'Phone number',
      email: 'Email'
    };
    return labels[fieldName] || fieldName;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.branchForm.get(fieldName);
    return !!(field && field.invalid && (field.touched || this.submitted));
  }


}

