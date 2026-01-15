import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, LoadingController, ToastController } from '@ionic/angular';
import { UserService } from '../../services/user.service';
import { CreateUserRequest } from '../../models/user.models';
import { UserContextService } from '../../services/user-context.service';

@Component({
  selector: 'app-add-staff-modal',
  templateUrl: './add-staff-modal.component.html',
  styleUrls: ['./add-staff-modal.component.scss']
})
export class AddStaffModalComponent implements OnInit {
  @Input() isEditing: boolean = false;
  @Input() editingStaffId: number | null = null;
  @Input() branchId: number | null = null;
  
  staffForm: FormGroup;
  submitted: boolean = false;
  roleOptions: string[] = ['BranchAdmin', 'Staff'];

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private userService: UserService,
    private userContext: UserContextService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.staffForm = this.formBuilder.group({
      email: ['', [Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      firstName: ['', [Validators.required]],
      middleName: [''],
      lastName: ['', [Validators.required]],
      phoneNumber: ['', [Validators.pattern(/^[0-9]{10}$/)]],
      address1: [''],
      address2: [''],
      city: [''],
      state: [''],
      pinCode: ['', [Validators.pattern(/^[0-9]{6}$/)]],
      level: ['branch'], // Fixed to 'branch'
      role: ['Staff', [Validators.required]], // Default to 'Staff', options: 'BranchAdmin' or 'Staff'
      organizationId: [0],
      branchId: [null]
    });
  }

  ngOnInit(): void {
    // Set organization ID
    const organizationId = this.userContext.organizationId;
    if (organizationId) {
      this.staffForm.patchValue({
        organizationId: organizationId
      });
    }
    
    // Use branchId from input (selected branch) or fallback to user context
    const branchId = this.branchId || this.userContext.branchId;
    if (branchId) {
      this.staffForm.patchValue({
        branchId: branchId
      });
    } else {
      console.warn('No branch ID available for staff creation');
    }
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;
    
    // Mark all fields as touched to show validation errors
    Object.keys(this.staffForm.controls).forEach(key => {
      this.staffForm.get(key)?.markAsTouched();
    });

    if (this.staffForm.invalid) {
      this.showToast('Please fill in all required fields correctly', 'danger');
      return;
    }

    const loading = await this.loadingController.create({
      message: this.isEditing ? 'Updating staff...' : 'Creating staff...',
      spinner: 'crescent'
    });
    await loading.present();

    const staffData: any = {
      firstName: this.staffForm.value.firstName.trim(),
      middleName: this.staffForm.value.middleName?.trim() || '',
      lastName: this.staffForm.value.lastName.trim(),
      phoneNumber: this.staffForm.value.phoneNumber?.trim() || '',
      address1: this.staffForm.value.address1?.trim() || '',
      address2: this.staffForm.value.address2?.trim() || '',
      city: this.staffForm.value.city?.trim() || '',
      state: this.staffForm.value.state?.trim() || '',
      pinCode: this.staffForm.value.pinCode?.trim() || '',
      email: this.staffForm.value.email?.trim() || '',
      password: this.staffForm.value.password,
      level: 'branch', // Fixed to 'branch'
      role: this.staffForm.value.role, // 'BranchAdmin' or 'Staff'
      organizationId: this.staffForm.value.organizationId,
      branchId: this.staffForm.value.branchId
    };

    this.userService.createUser(staffData).subscribe({
      next: async (staff) => {
        await loading.dismiss();
        this.showToast(
          this.isEditing ? 'Staff updated successfully!' : 'Staff created successfully!', 
          'success'
        );
        // Close modal and return success
        await this.modalController.dismiss({ success: true, staff });
      },
      error: async (error) => {
        await loading.dismiss();
        const errorMessage = error.error?.message || error.message || 'Failed to create staff. Please try again.';
        this.showToast(errorMessage, 'danger');
        console.error('Error creating staff:', error);
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
    const field = this.staffForm.get(fieldName);
    if (field && field.invalid && (field.touched || this.submitted)) {
      if (field.errors?.['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (field.errors?.['email']) {
        return 'Please enter a valid email address';
      }
      if (field.errors?.['pattern']) {
        if (fieldName === 'phoneNumber') {
          return 'Please enter a valid 10-digit phone number';
        }
        if (fieldName === 'pinCode') {
          return 'Please enter a valid 6-digit pin code';
        }
      }
      if (field.errors?.['minlength']) {
        if (fieldName === 'password') {
          return 'Password must be at least 6 characters long';
        }
      }
    }
    return '';
  }

  getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      firstName: 'First name',
      lastName: 'Last name',
      phoneNumber: 'Phone number',
      email: 'Email',
      password: 'Password',
      pinCode: 'Pin code',
      role: 'Role'
    };
    return labels[fieldName] || fieldName;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.staffForm.get(fieldName);
    return !!(field && field.invalid && (field.touched || this.submitted));
  }
}

