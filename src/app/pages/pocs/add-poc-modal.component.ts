import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, LoadingController, ToastController, IonContent } from '@ionic/angular';
import { UserContextService } from '../../services/user-context.service';
import { PocService, CreatePocRequest } from '../../services/poc.service';
import { MemberService } from '../../services/member.service';
import { MasterDataService } from '../../services/master-data.service';
import { MasterLookup } from '../../models/master-data.models';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.models';

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
  @ViewChild(IonContent) ionContent!: IonContent;
  
  pocForm: FormGroup;
  submitted: boolean = false;
  centers: Center[] = [];
  states: MasterLookup[] = [];
  users: User[] = [];
  isLoadingCenters: boolean = false;
  isLoadingStates: boolean = false;
  isLoadingUsers: boolean = false;
  private organizationStateName: string | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private userContext: UserContextService,
    private pocService: PocService,
    private memberService: MemberService,
    private masterDataService: MasterDataService,
    private userService: UserService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.pocForm = this.formBuilder.group({
      firstName: ['', [Validators.required, Validators.maxLength(200), Validators.pattern(/^[a-zA-Z ]+$/)]],
      lastName: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^[a-zA-Z ]+$/)]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      altPhone: ['', [Validators.pattern(/^[0-9]{10}$/)]],
      address1: ['', [Validators.required, Validators.maxLength(100)]],
      address2: ['', [Validators.maxLength(100)]],
      city: [''],
      state: [''],
      pinCode: ['', [Validators.pattern(/^[0-9]{6}$/)]],
      centerId: [null, [Validators.required]],
      collectionFrequency: ['Weekly', [Validators.required]],
      collectionDay: [''],
      collectionBy: [null, [Validators.required]],
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

    // Watch for collection frequency changes to conditionally require collection day
    this.pocForm.get('collectionFrequency')?.valueChanges.subscribe(frequency => {
      const collectionDayControl = this.pocForm.get('collectionDay');
      if (frequency === 'Weekly') {
        collectionDayControl?.setValidators([Validators.required]);
      } else {
        collectionDayControl?.clearValidators();
        collectionDayControl?.setValue('');
      }
      collectionDayControl?.updateValueAndValidity();
    });

    // Set initial validation based on default value
    if (this.pocForm.get('collectionFrequency')?.value === 'Weekly') {
      this.pocForm.get('collectionDay')?.setValidators([Validators.required]);
      this.pocForm.get('collectionDay')?.updateValueAndValidity();
    }

    this.loadOrganizationStateFromStorage();
    this.loadStates();

    // Load active users
    this.loadUsers();

    // Load POC data if editing
    if (this.isEditing && this.editingPocId) {
      this.loadPocData(this.editingPocId);
    }
  }

  async loadPocData(pocId: number): Promise<void> {
    const loading = await this.loadingController.create({
      message: 'Loading POC data...',
      spinner: 'crescent'
    });
    await loading.present();

    // Using getPocs() and filtering, since there's no getPocById in the service
    this.pocService.getPocs().subscribe({
      next: (pocs) => {
        loading.dismiss();
        const poc = pocs.find(p => p.id === pocId);
        if (poc) {
          this.pocForm.patchValue({
            firstName: poc.firstName,
            lastName: poc.lastName || '',
            phoneNumber: poc.phoneNumber,
            altPhone: poc.altPhone || '',
            address1: poc.address1 || '',
            address2: poc.address2 || '',
            city: poc.city || '',
            state: poc.state || '',
            pinCode: poc.pinCode || '',
            centerId: poc.centerId,
            collectionFrequency: poc.collectionFrequency || 'Weekly',
            collectionDay: poc.collectionDay || '',
            collectionBy: poc.collectionBy || null
          });
        } else {
          this.showToast('POC not found', 'danger');
          this.closeModal();
        }
      },
      error: (error) => {
        loading.dismiss();
        console.error('Error loading POC data:', error);
        this.showToast('Failed to load POC data', 'danger');
        this.closeModal();
      }
    });
  }

  private loadOrganizationStateFromStorage(): void {
    const stored = localStorage.getItem('organization_info');
    if (!stored) return;
    try {
      const org: { state?: string } = JSON.parse(stored);
      const state = org?.state;
      if (state && typeof state === 'string' && state.trim().length > 0) {
        this.organizationStateName = state.trim();
      }
    } catch {
      this.organizationStateName = null;
    }
  }

  private applyOrgStateDefaultIfNeeded(): void {
    if (this.isEditing) return;
    if (!this.organizationStateName) return;
    const stateControl = this.pocForm.get('state');
    if (!stateControl || (stateControl.value || '').toString().trim()) return;
    const target = this.organizationStateName.toLowerCase();
    const match = this.states.find(
      s => (s.lookupValue || '').toLowerCase() === target || (s.lookupCode || '').toLowerCase() === target
    );
    if (match) stateControl.setValue(match.lookupCode);
  }

  loadStates(): void {
    this.isLoadingStates = true;
    this.masterDataService.getMasterData().subscribe({
      next: (allLookups) => {
        this.states = allLookups.filter(lookup => lookup.lookupKey === 'STATE').sort((a, b) => a.sortOrder - b.sortOrder);
        this.isLoadingStates = false;
        this.applyOrgStateDefaultIfNeeded();
      },
      error: (error) => {
        console.error('Error loading states:', error);
        this.states = [];
        this.isLoadingStates = false;
        this.showToast('Failed to load states. Please try again.', 'danger');
      }
    });
  }

  onFirstNameInput(event: Event): void {
    const raw = (event.target as HTMLInputElement)?.value ?? '';
    const sanitized = (raw || '').replace(/[^a-zA-Z ]/g, '');
    const truncated = sanitized.slice(0, 200);
    const control = this.pocForm.get('firstName');
    if (control && control.value !== truncated) {
      control.setValue(truncated);
    }
  }

  onLastNameInput(event: Event): void {
    const raw = (event.target as HTMLInputElement)?.value ?? '';
    const sanitized = (raw || '').replace(/[^a-zA-Z ]/g, '');
    const truncated = sanitized.slice(0, 100);
    const control = this.pocForm.get('lastName');
    if (control && control.value !== truncated) {
      control.setValue(truncated);
    }
  }

  onPinCodeInput(event: Event): void {
    const raw = (event.target as HTMLInputElement)?.value ?? '';
    const sanitized = (raw || '').replace(/[^0-9]/g, '');
    const truncated = sanitized.slice(0, 6);
    const control = this.pocForm.get('pinCode');
    if (control && control.value !== truncated) {
      control.setValue(truncated);
    }
  }
  async loadCenters(branchId: number): Promise<void> {
    this.isLoadingCenters = true;
    
    this.memberService.getCentersByBranch(branchId).subscribe({
      next: (centers) => {
        this.centers = centers.map(center => ({
          id: center.id,
          name: center.name,
          branchId: center.branchId
        }));
        this.isLoadingCenters = false;
      },
      error: (error) => {
        console.error('Error loading centers:', error);
        this.centers = [];
        this.isLoadingCenters = false;
        this.showToast('Failed to load centers. Please try again.', 'danger');
      }
    });
  }

  async loadUsers(): Promise<void> {
    this.isLoadingUsers = true;
    
    this.userService.getUsers().subscribe({
      next: (users) => {
        // Filter for active users only - you can adjust the filter criteria as needed
        this.users = users.filter(user => user.id);
        this.isLoadingUsers = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.users = [];
        this.isLoadingUsers = false;
        this.showToast('Failed to load users. Please try again.', 'danger');
      }
    });
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;
    
    // Mark all fields as touched to show validation errors
    Object.keys(this.pocForm.controls).forEach(key => {
      this.pocForm.get(key)?.markAsTouched();
    });

    if (this.pocForm.invalid) {
      this.showToast('Please fill in all required fields correctly', 'danger');
      this.focusOnFirstInvalidField();
      return;
    }

    const loading = await this.loadingController.create({
      message: this.isEditing ? 'Updating POC...' : 'Creating POC...',
      spinner: 'crescent'
    });
    await loading.present();

    const pocData: CreatePocRequest = {
      firstName: this.pocForm.value.firstName.trim(),
      lastName: this.pocForm.value.lastName?.trim() || '',
      phoneNumber: this.pocForm.value.phoneNumber?.trim() || '',
      altPhone: this.pocForm.value.altPhone?.trim() || '',
      address1: this.pocForm.value.address1?.trim() || '',
      address2: this.pocForm.value.address2?.trim() || '',
      city: this.pocForm.value.city?.trim() || '',
      state: this.pocForm.value.state?.trim() || '',
      pinCode: this.pocForm.value.pinCode?.trim() || '',
      centerId: this.pocForm.value.centerId,
      collectionFrequency: this.pocForm.value.collectionFrequency || 'Weekly',
      collectionDay: this.pocForm.value.collectionDay || '',
      collectionBy: this.pocForm.value.collectionBy || 0
    };

    const apiCall = this.isEditing && this.editingPocId
      ? this.pocService.updatePoc(this.editingPocId, pocData)
      : this.pocService.createPoc(pocData);

    apiCall.subscribe({
      next: async (poc) => {
        await loading.dismiss();
        this.showToast(
          this.isEditing ? 'POC updated successfully' : 'POC created successfully',
          'success'
        );
        this.modalController.dismiss({ success: true, data: poc });
      },
      error: async (error) => {
        await loading.dismiss();
        console.error('Error saving POC:', error);
        const errorMessage = error.error?.message || error.message || 'Failed to save POC. Please try again.';
        this.showToast(errorMessage, 'danger');
      }
    });
  }

  closeModal(): void {
    this.modalController.dismiss({ success: false });
  }

  focusOnFirstInvalidField(): void {
    const fieldOrder = ['firstName', 'lastName', 'phoneNumber', 'altPhone', 'address1', 'address2', 'city', 'state', 'pinCode', 'centerId'];
    
    for (const fieldName of fieldOrder) {
      const control = this.pocForm.get(fieldName);
      if (control && control.invalid) {
        // Find the corresponding input element and focus on it
        const inputElement = document.querySelector(`[formControlName="${fieldName}"]`) as HTMLInputElement | HTMLSelectElement;
        if (inputElement) {
          inputElement.focus();
          // Scroll the element into view
          inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        break;
      }
    }
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
        if (fieldName === 'altPhone') {
          return 'Please enter a valid 10-digit phone number';
        }
        if (fieldName === 'pinCode') {
          return 'PIN code must be exactly 6 digits';
        }
        if (fieldName === 'firstName') {
          return 'First name must contain only letters';
        }
        if (fieldName === 'lastName') {
          return 'Surname must contain only letters';
        }
      }
      if (field.errors['maxlength']) {
        if (fieldName === 'firstName') {
          return 'First name must be at most 200 characters';
        }
        if (fieldName === 'lastName') {
          return 'Surname must be at most 100 characters';
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
