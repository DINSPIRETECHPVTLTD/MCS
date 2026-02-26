import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, LoadingController, ToastController } from '@ionic/angular';
import { UserService } from '../../services/user.service';
import { UserContextService } from '../../services/user-context.service';
import { OrganizationService } from '../../services/organization.service';
import { CreateUserRequest } from 'src/app/models/user.models';
import { MasterDataService } from '../../services/master-data.service';
import { MasterLookup, LookupKeys } from 'src/app/models/master-data.models';

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
  states: MasterLookup[] = [];
  isLoadingStates: boolean = false;
  private organizationStateName: string | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private userService: UserService,
    private userContext: UserContextService,
    private organizationService: OrganizationService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private masterDataService: MasterDataService
  ) {
    this.userForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      firstName: ['', [Validators.required]],
      SurName: ['', [Validators.required]],
      phoneNumber: ['', [Validators.pattern(/^[0-9]{10}$/), Validators.required]],
      address1: [''],
      address2: [''],
      city: [''],      state: [''],      zipCode: ['', [Validators.pattern(/^[0-9]{6}$/)]],
      level: ['Org', [Validators.required]],
      role: ['',[Validators.required]],
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

    // Load organization state (if available) from stored organization info
    this.loadOrganizationState();

    // Load state lookups from master data
    this.loadStates();

    // Subscribe to role changes to update validators
    this.userForm.get('role')?.valueChanges.subscribe((role) => {
      this.updateValidatorsForRole(role);
    });

    // Load user data if editing
    if (this.isEditing && this.editingUserId) {
      this.loadUserData();
      this.userForm.get('role')?.disable(); // Disable role selection when editing
    }
  }

  private loadOrganizationState(): void {
    const organizationId = this.userContext.organizationId;
    if (!organizationId) {
      return;
    }

    this.organizationService.getOrganization(organizationId).subscribe({
      next: (org) => {
        const state = (org?.state ?? '').toString().trim();
        this.organizationStateName = state.length > 0 ? state : null;
        this.applyOrgStateDefaultIfNeeded();
      },
      error: () => {
        this.organizationStateName = null;
      }
    });
  }

  private applyOrgStateDefaultIfNeeded(): void {
    if (this.isEditing) return;
    if (!this.organizationStateName) return;

    const currentStateControl = this.userForm.get('state');
    const currentStateValue = (currentStateControl?.value || '').toString().trim();
    if (currentStateValue) return; // Do not override if user/state already set

    const target = this.organizationStateName.toLowerCase();
    const match = this.states.find(s => (s.lookupValue || '').toLowerCase() === target);
    if (match) {
      currentStateControl?.setValue(match.lookupValue);
    }
  }

  private loadStates(): void {
    this.isLoadingStates = true;
    this.masterDataService.getMasterData().subscribe({
      next: (allLookups) => {
        this.states = (allLookups || [])
          .filter(l => l.lookupKey === LookupKeys.State)
          .sort((a, b) => (a.lookupValue || '').localeCompare(b.lookupValue || '', undefined, { sensitivity: 'base' }));
        this.isLoadingStates = false;
        this.applyOrgStateDefaultIfNeeded();
      },
      error: () => {
        this.states = [];
        this.isLoadingStates = false;
      }
    });
  }

  updateValidatorsForRole(role: string): void {
    const emailControl = this.userForm.get('email');
    const passwordControl = this.userForm.get('password');

    if (role === 'Investor') {
      // For Investor role, clear validators for email and password
      emailControl?.clearValidators();
      emailControl?.setValue('');
      passwordControl?.clearValidators();
      passwordControl?.setValue('');
    } else {
      // For other roles, add validators for email and password
      emailControl?.setValidators([Validators.required, Validators.email]);
      if (!this.isEditing) {
        passwordControl?.setValidators([Validators.required, Validators.minLength(6)]);
      }
    }

    emailControl?.updateValueAndValidity();
    passwordControl?.updateValueAndValidity();
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
          SurName: user.lastName || '',
          phoneNumber: user.phoneNumber || '',
          address1: user.address1 || '',
          address2: user.address2 || '',
          city: user.city || '',
          state: user.state || '',
          zipCode: user.zipCode || '',
          email: user.email || '',
          level: user.level || 'Org',
          role: user.role || 'Owner',
          organizationId: user.organizationId || this.userContext.organizationId
        });
        // Update validators based on role
        this.updateValidatorsForRole(user.role || 'Owner');
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

  onNumericInput(event: Event, fieldName: string): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    const numericValue = value.replace(/[^0-9]/g, '');
    if (value !== numericValue) {
      this.userForm.get(fieldName)?.setValue(numericValue);
    }
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

    const firstName = this.userForm.value.firstName.trim();
    const lastName = this.userForm.value.SurName.trim() || '';
    const role = this.userForm.value.role;

    const userData: CreateUserRequest = {
      firstName: firstName,
      lastName: lastName,
      phoneNumber: this.userForm.value.phoneNumber?.trim() || '',
      address1: this.userForm.value.address1?.trim() || '',
      address2: this.userForm.value.address2?.trim() || '',
      city: this.userForm.value.city?.trim() || '',
      state: this.userForm.value.state?.trim() || '',
      zipCode: this.userForm.value.zipCode?.trim() || '',
      email: role === 'Investor' ? `${firstName}${lastName}@investor.com` : (this.userForm.value.email?.trim() || ''),
      level: this.userForm.value.level,
      role: role,
      organizationId: this.userForm.value.organizationId,
      branchId: null
    }as CreateUserRequest;

    // Add password for new user creation
    if (!this.isEditing) {
      if (role === 'Investor') {
        userData.password = 'Dummy@123'; // Dummy password for Investor role
      } else if (this.userForm.value.password) {
        userData.password = this.userForm.value.password;
      }
    }

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
      console.log('Creating user with data:', userData); // Debug log
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
        if (fieldName === 'zipCode') {
          return 'Please enter a valid 6-digit Pin code';
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
      zipCode: 'Pin code',
      role: 'Role'
    };
    return labels[fieldName] || fieldName;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    return !!(field && field.invalid && (field.touched || this.submitted));
  }
}


