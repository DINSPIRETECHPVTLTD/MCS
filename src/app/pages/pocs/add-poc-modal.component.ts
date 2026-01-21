import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, LoadingController, ToastController } from '@ionic/angular';
import { UserContextService } from '../../services/user-context.service';
import { BranchService } from '../../services/branch.service';

export interface Center {
  id: number;
  name: string;
  code?: string;
  address?: string;
  branchId?: number;
}

@Component({
  selector: 'app-add-poc-modal',
  templateUrl: './add-poc-modal.component.html',
  styleUrls: ['./add-poc-modal.component.scss']
})
export class AddPocModalComponent implements OnInit {
  @Input() isEditing: boolean = false;
  @Input() editingPocId: number | null = null;
  @Input() branchId: number | null = null;
  
  pocForm: FormGroup;
  submitted: boolean = false;
  centers: Center[] = [];
  isLoadingCenters: boolean = false;

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private userContext: UserContextService,
    private branchService: BranchService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.pocForm = this.formBuilder.group({
      firstName: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^[a-zA-Z ]+$/)]],
      middleName: ['', [Validators.maxLength(100), Validators.pattern(/^[a-zA-Z ]+$/)]],
      lastName: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^[a-zA-Z ]+$/)]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      address1: ['', [Validators.maxLength(100)]],
      address2: ['', [Validators.maxLength(100)]],
      city: [''],
      state: [''],
      zipCode: [''],
      country: ['India'],
      centerId: [null, [Validators.required]],
      branchId: [null]
    });
  }

  ngOnInit(): void {
    // Use branchId from input (selected branch) or fallback to user context
    const branchId = this.branchId || this.userContext.branchId;
    if (branchId) {
      this.pocForm.patchValue({
        branchId: branchId
      });
      // Load centers for this branch
      this.loadCenters(branchId);
    } else {
      console.warn('No branch ID available for POC creation');
    }
  }
  onFirstNameInput(event: any): void {
    const raw = event?.detail?.value ?? '';
    const sanitized = (raw || '').replace(/[^a-zA-Z ]/g, '');
    const truncated = sanitized.slice(0, 100);
    const control = this.pocForm.get('firstName');
    if (control && control.value !== truncated) {
      control.setValue(truncated);
    }
  }

  onMiddleNameInput(event: any): void {
    const raw = event?.detail?.value ?? '';
    const sanitized = (raw || '').replace(/[^a-zA-Z ]/g, '');
    const truncated = sanitized.slice(0, 100);
    const control = this.pocForm.get('middleName');
    if (control && control.value !== truncated) {
      control.setValue(truncated);
    }
  }

  onLastNameInput(event: any): void {
    const raw = event?.detail?.value ?? '';
    const sanitized = (raw || '').replace(/[^a-zA-Z ]/g, '');
    const truncated = sanitized.slice(0, 100);
    const control = this.pocForm.get('lastName');
    if (control && control.value !== truncated) {
      control.setValue(truncated);
    }
  }
  async loadCenters(branchId: number): Promise<void> {
    this.isLoadingCenters = true;
    
    // TODO: Replace with actual centers API call when available
    // For now, using dummy data
    // Example: this.centersService.getCentersByBranch(branchId).subscribe(...)
    
    // Dummy data for demonstration
    setTimeout(() => {
      this.centers = [
        { id: 1, name: 'Fatima Nagar', code: 'FN001', branchId: branchId },
        { id: 2, name: 'Hasan Nagar Indiranagar', code: 'HN001', branchId: branchId },
        { id: 3, name: 'Zoopark Kalapathra', code: 'ZK001', branchId: branchId },
        { id: 4, name: 'Mangal Hat', code: 'MH001', branchId: branchId },
        { id: 5, name: 'Kishan Bagh', code: 'KB001', branchId: branchId }
      ];
      this.isLoadingCenters = false;
    }, 300);
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;
    
    // Mark all fields as touched to show validation errors
    Object.keys(this.pocForm.controls).forEach(key => {
      this.pocForm.get(key)?.markAsTouched();
    });

    if (this.pocForm.invalid) {
      this.showToast('Please fill in all required fields correctly', 'danger');
      return;
    }

    const loading = await this.loadingController.create({
      message: this.isEditing ? 'Updating POC...' : 'Creating POC...',
      spinner: 'crescent'
    });
    await loading.present();

    const pocData: any = {
      firstName: this.pocForm.value.firstName.trim(),
      middleName: this.pocForm.value.middleName?.trim() || '',
      lastName: this.pocForm.value.lastName.trim(),
      phoneNumber: this.pocForm.value.phoneNumber?.trim() || '',
      address1: this.pocForm.value.address1?.trim() || '',
      address2: this.pocForm.value.address2?.trim() || '',
      city: this.pocForm.value.city?.trim() || '',
      state: this.pocForm.value.state?.trim() || '',
      zipCode: this.pocForm.value.zipCode?.trim() || '',
      country: this.pocForm.value.country?.trim() || '',
      centerId: this.pocForm.value.centerId,
      branchId: this.pocForm.value.branchId
    };

    try {
      // TODO: Replace with actual API call when POCs service is available
      // if (this.isEditing && this.editingPocId) {
      //   await this.pocService.updatePoc(this.editingPocId, pocData).toPromise();
      // } else {
      //   await this.pocService.createPoc(pocData).toPromise();
      // }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      loading.dismiss();
      this.showToast(
        this.isEditing ? 'POC updated successfully' : 'POC created successfully',
        'success'
      );
      this.modalController.dismiss({ success: true, data: pocData });
    } catch (error: any) {
      loading.dismiss();
      console.error('Error saving POC:', error);
      this.showToast(
        error.error?.message || 'Failed to save POC. Please try again.',
        'danger'
      );
    }
  }

  closeModal(): void {
    this.modalController.dismiss({ success: false });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.pocForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }

  getFieldError(fieldName: string): string {
    const field = this.pocForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) {
        return 'This field is required';
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address';
      }
      if (field.errors['minlength']) {
        return `Minimum ${field.errors['minlength'].requiredLength} characters required`;
      }
      if (field.errors['pattern']) {
        if (fieldName === 'phoneNumber') {
          return 'Please enter a valid 10-digit phone number';
        }
        if (fieldName === 'zipCode') {
          return 'Please enter a valid 6-digit ZIP code';
        }
        if (fieldName === 'firstName') {
          return 'First name must contain only letters';
        }
        if (fieldName === 'middleName') {
          return 'Middle name must contain only letters';
        }
        if (fieldName === 'lastName') {
          return 'Last name must contain only letters';
        }
      }
      if (field.errors['maxlength']) {
        if (fieldName === 'firstName') {
          return 'First name must be at most 100 characters';
        }
        if (fieldName === 'middleName') {
          return 'Middle name must be at most 100 characters';
        }
        if (fieldName === 'lastName') {
          return 'Last name must be at most 100 characters';
        }
        if (fieldName === 'address1' || fieldName === 'address2') {
          return 'Address must be at most 100 characters';
        }
      }
    }
    return '';
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    toast.present();
  }
}
