import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, LoadingController, ToastController } from '@ionic/angular';
import { UserService } from '../../services/user.service';
import { UserContextService } from '../../services/user-context.service';
import { CreateUserRequest } from 'src/app/models/user.models';

@Component({
  selector: 'app-add-user-modal',
  templateUrl: './add-user-modal.component.html',
  styleUrls: ['./add-user-modal.component.scss']
})
export class AddUserModalComponent implements OnInit {
  @Input() isEditing: boolean = false;
  @Input() editingUserId: number | null = null;
  
  userForm: FormGroup;
  submitted: boolean = false;

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private userService: UserService,
    private userContext: UserContextService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.userForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      firstName: ['', [Validators.required]],
      middleName: [''],
      lastName: ['', [Validators.required]],
      phoneNumber: ['', [Validators.pattern(/^[0-9]{10}$/), Validators.required]],
      address1: [''],
      address2: [''],
      city: [''],
      state: [''],
      pinCode: ['', [Validators.pattern(/^[0-9]{6}$/)]],
      level: ['Org', [Validators.required]],
      role: ['Owner', [Validators.required]],
      organizationId: [0]
    });
  }

  ngOnInit(): void {
    // Set organization ID
    const organizationId = this.userContext.organizationId;
    if (organizationId) {
      this.userForm.patchValue({
        organizationId: organizationId
      });
    }

    // Load user data if editing
    if (this.isEditing && this.editingUserId) {
      this.loadUserData();
    }
  }

  async loadUserData(): Promise<void> {
    if (!this.editingUserId) return;

    const loading = await this.loadingController.create({
      message: 'Loading user data...',
      spinner: 'crescent'
    });
    await loading.present();

    this.userService.getUser(this.editingUserId).subscribe({
      next: async (user) => {
        await loading.dismiss();
        // Patch form with user data
        this.userForm.patchValue({
          firstName: user.firstName || '',
          middleName: user.middleName || '',
          lastName: user.lastName || '',
          phoneNumber: user.phoneNumber || '',
          address1: user.address1 || '',
          address2: user.address2 || '',
          city: user.city || '',
          state: user.state || '',
          pinCode: user.pinCode || '',
          email: user.email || '',
          level: user.level || 'Org',
          role: user.role || 'Owner',
          organizationId: user.organizationId || this.userContext.organizationId
        });
        // Make password optional when editing
        this.userForm.get('password')?.clearValidators();
        this.userForm.get('password')?.updateValueAndValidity();
      },
      error: async (error) => {
        await loading.dismiss();
        this.showToast('Failed to load user data', 'danger');
        console.error('Error loading user:', error);
      }
    });
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;
    
    // Mark all fields as touched to show validation errors
    Object.keys(this.userForm.controls).forEach(key => {
      this.userForm.get(key)?.markAsTouched();
    });

    if (this.userForm.invalid) {
      this.showToast('Please fill in all required fields correctly', 'danger');
      return;
    }

    const loading = await this.loadingController.create({
      message: this.isEditing ? 'Updating user...' : 'Creating user...',
      spinner: 'crescent'
    });
    await loading.present();

    const userData: CreateUserRequest = {
      firstName: this.userForm.value.firstName.trim(),
      middleName: this.userForm.value.middleName?.trim() || '',
      lastName: this.userForm.value.lastName.trim(),
      phoneNumber: this.userForm.value.phoneNumber?.trim() || '',
      address1: this.userForm.value.address1?.trim() || '',
      address2: this.userForm.value.address2?.trim() || '',
      city: this.userForm.value.city?.trim() || '',
      state: this.userForm.value.state?.trim() || '',
      pinCode: this.userForm.value.pinCode?.trim() || '',
      email: this.userForm.value.email?.trim() || '',
      level: this.userForm.value.level,
      role: this.userForm.value.role,
      organizationId: this.userForm.value.organizationId,
      branchId: null
    };

    if (this.isEditing && this.editingUserId) {
      // Update existing user
      this.userService.updateUser(this.editingUserId, userData).subscribe({
        next: async (user) => {
          await loading.dismiss();
          this.showToast('User updated successfully!', 'success');
          await this.modalController.dismiss({ success: true, user });
        },
        error: async (error) => {
          await loading.dismiss();
          const errorMessage = error.error?.message || error.message || 'Failed to update user. Please try again.';
          this.showToast(errorMessage, 'danger');
          console.error('Error updating user:', error);
        }
      });
    } else {
      // Create new user
      this.userService.createUser(userData).subscribe({
        next: async (user) => {
          await loading.dismiss();
          this.showToast('User created successfully!', 'success');
          await this.modalController.dismiss({ success: true, user });
        },
        error: async (error) => {
          await loading.dismiss();
          const errorMessage = error.error?.message || error.message || 'Failed to create user. Please try again.';
          this.showToast(errorMessage, 'danger');
          console.error('Error creating user:', error);
        }
      });
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
    const field = this.userForm.get(fieldName);
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
      pinCode: 'Pin code'
    };
    return labels[fieldName] || fieldName;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    return !!(field && field.invalid && (field.touched || this.submitted));
  }
}


