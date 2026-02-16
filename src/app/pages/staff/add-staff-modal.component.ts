import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, LoadingController, ToastController } from '@ionic/angular';
import { UserService } from '../../services/user.service';
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

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private userService: UserService,
    private userContext: UserContextService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.staffForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(12)]],
      firstName: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^[a-zA-Z0-9 ]+$/)]],
      lastName: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^[a-zA-Z0-9 ]+$/)]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      address1: ['', [Validators.required, Validators.maxLength(100)]],
      address2: ['', [Validators.maxLength(100)]],
      city: ['', [Validators.required, Validators.maxLength(100)]],
      state: ['', [Validators.required, Validators.maxLength(100)]],
      pinCode: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/), Validators.maxLength(6)]],
      organizationId: [0],
      branchId: [null],
      role: ['Staff', [Validators.required]]
      
    });
  }

  onEmailInput(event: any): void {
    const raw = event?.detail?.value ?? '';
    const truncated = (raw || '').slice(0, 100);
    const control = this.staffForm.get('email');
    if (control && control.value !== truncated) {
      control.setValue(truncated);
    }
  }

  onAddressInput(event: any, fieldName: string): void {
    const raw = event?.detail?.value ?? '';
    const truncated = (raw || '').slice(0, 100);
    const control = this.staffForm.get(fieldName);
    if (control && control.value !== truncated) {
      control.setValue(truncated);
    }
  }

  onFirstNameInput(event: any): void {
    const raw = event?.detail?.value ?? '';
    const sanitized = (raw || '').replace(/[^a-zA-Z0-9 ]/g, '');
    const truncated = sanitized.slice(0, 100);
    const control = this.staffForm.get('firstName');
    if (control && control.value !== truncated) {
      control.setValue(truncated);
    }
  }

  onLastNameInput(event: any): void {
    const raw = event?.detail?.value ?? '';
    const sanitized = (raw || '').replace(/[^a-zA-Z0-9 ]/g, '');
    const truncated = sanitized.slice(0, 100);
    const control = this.staffForm.get('lastName');
    if (control && control.value !== truncated) {
      control.setValue(truncated);
    }
  }

  onPhoneInput(event: any): void {
    const raw = event?.detail?.value ?? '';
    const sanitized = (raw || '').replace(/[^0-9]/g, '');
    const truncated = sanitized.slice(0, 10);
    const control = this.staffForm.get('phoneNumber');
    if (control && control.value !== truncated) {
      control.setValue(truncated);
    }
  }

  onPasswordInput(event: any): void {
    const raw = event?.detail?.value ?? '';
    const truncated = (raw || '').slice(0, 12);
    const control = this.staffForm.get('password');
    if (control && control.value !== truncated) {
      control.setValue(truncated);
    }
  }

  onPinInput(event: any): void {
    const raw = event?.detail?.value ?? '';
    const sanitized = (raw || '').replace(/[^0-9]/g, '');
    const truncated = sanitized.slice(0, 6);
    const control = this.staffForm.get('pinCode');
    if (control && control.value !== truncated) {
      control.setValue(truncated);
    }
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

    // If editing, make password optional and load existing user data
    if (this.isEditing && this.editingStaffId) {
      const pwdControl = this.staffForm.get('password');
      if (pwdControl) {
        pwdControl.clearValidators();
        pwdControl.updateValueAndValidity();
      }

      // Relax validators for non-essential fields during edit so partial updates work
      const relaxFields = ['phoneNumber', 'address1', 'address2', 'city', 'state', 'pinCode'];
      relaxFields.forEach(fn => {
        const c = this.staffForm.get(fn);
        if (c) {
          c.clearValidators();
          c.updateValueAndValidity();
        }
      });

      this.userService.getUser(this.editingStaffId).subscribe({
        next: (user) => {
          // Handle multiple possible field names for zipCode
          const zipCodeValue = (user as any)?.zipCode || (user as any)?.ZipCode || (user as any)?.pinCode || '';
          console.log('User loaded for edit:', user, 'zipCode value:', zipCodeValue);
          this.staffForm.patchValue({
            email: user.email || '',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            phoneNumber: user.phoneNumber || '',
            address1: user.address1 || '',
            address2: user.address2 || '',
            city: user.city || '',
            state: user.state || '',
            pinCode: zipCodeValue,
            role: user.role ? (user.role.toLowerCase().includes('branch') ? 'BranchAdmin' : 'Staff') : 'Staff',
            organizationId: user.organizationId || this.staffForm.value.organizationId,
            branchId: user.branchId || this.staffForm.value.branchId
          });
        },
        error: (err) => {
          console.error('Failed to load user for editing', err);
        }
      });
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
      this.focusFirstInvalidField();
      return;
    }

    const loading = await this.loadingController.create({
      message: this.isEditing ? 'Updating staff...' : 'Creating staff...',
      spinner: 'crescent'
    });
    await loading.present();

    const staffData: any = {
      firstName: this.staffForm.value.firstName.trim(),
      lastName: this.staffForm.value.lastName.trim(),
      phoneNumber: this.staffForm.value.phoneNumber?.trim() || '',
      address1: this.staffForm.value.address1?.trim() || '',
      address2: this.staffForm.value.address2?.trim() || '',
      city: this.staffForm.value.city?.trim() || '',
      state: this.staffForm.value.state?.trim() || '',
      pinCode: this.staffForm.value.pinCode?.trim() || '',
      email: this.staffForm.value.email?.trim() || '',
      password: this.staffForm.value.password,
      role: this.staffForm.value.role,
      level:'Branch',
      organizationId: this.staffForm.value.organizationId,
      branchId: this.staffForm.value.branchId
    };

    if (this.isEditing && this.editingStaffId) {
      // If password is empty, don't send it in update payload
      if (!this.staffForm.value.password) {
        delete staffData.password;
      }
      // Map to backend column names requested by user for PUT (preserve other required metadata)
      const putPayload: any = {
        FirstName: staffData.firstName,
        LastName: staffData.lastName,
        Email: staffData.email,
        PhoneNumber: staffData.phoneNumber,
        Address1: staffData.address1,
        Address2: staffData.address2,
        City: staffData.city,
        State: staffData.state,
        ZipCode: staffData.pinCode,
        role: staffData.role,
        level: staffData.level,
        organizationId: staffData.organizationId,
        branchId: staffData.branchId
      };
      if (staffData.password) {
        putPayload.Password = staffData.password;
      }
      this.userService.updateUser(this.editingStaffId, putPayload).subscribe({
        next: async (staff) => {
          await loading.dismiss();
          this.showToast('Staff updated successfully!', 'success');
          await this.modalController.dismiss({ success: true, staff });
        },
        error: async (error) => {
          await loading.dismiss();
          const errorMessage = error.error?.message || error.message || 'Failed to update staff. Please try again.';
          this.showToast(errorMessage, 'danger');
          console.error('Error updating staff:', error);
        }
      });
    } else {
      // Map to backend column names for POST (match PascalCase used in PUT)
      const postPayload: any = {
        FirstName: staffData.firstName,
        LastName: staffData.lastName,
        Email: staffData.email,
        PhoneNumber: staffData.phoneNumber,
        Address1: staffData.address1,
        Address2: staffData.address2,
        City: staffData.city,
        State: staffData.state,
        ZipCode: staffData.pinCode,
        Password: staffData.password,
        Role: staffData.role,
        Level: staffData.level,
        OrganizationId: staffData.organizationId,
        BranchId: staffData.branchId
      };
      this.userService.createUser(postPayload).subscribe({
        next: async (staff) => {
          await loading.dismiss();
          this.showToast('Staff created successfully!', 'success');
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
  }

  private focusFirstInvalidField(): void {
    const order = ['email','password','firstName','lastName','phoneNumber','address1','address2','city','state','pinCode'];
    for (const name of order) {
      const control = this.staffForm.get(name);
      if (control && control.invalid) {
        // Delay to allow validation messages to render
        setTimeout(() => {
          // Prefer Ionic components
          const ionEl = document.querySelector(`ion-input[formControlName="${name}"], ion-textarea[formControlName="${name}"], ion-select[formControlName="${name}"]`);
          if (ionEl) {
            const anyEl: any = ionEl;
            if (typeof anyEl.setFocus === 'function') {
              anyEl.setFocus();
              return;
            }
            const inner = ionEl.querySelector('input, textarea') as HTMLElement | null;
            if (inner && typeof inner.focus === 'function') inner.focus();
            return;
          }

          // Fallback to native element
          const nativeEl = document.querySelector(`[formControlName="${name}"]`) as HTMLElement | null;
          if (nativeEl && typeof (nativeEl as any).focus === 'function') {
            (nativeEl as any).focus();
          }
        }, 50);
        break;
      }
    }
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
      if (field.errors?.['maxlength']) {
        if (fieldName === 'email') {
          return 'Email must be at most 100 characters';
        }
        return `${this.getFieldLabel(fieldName)} must be at most ${field.errors['maxlength'].requiredLength} characters`;
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
      lastName: 'Surname',
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

