import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, LoadingController, ToastController } from '@ionic/angular';
import { BranchService } from '../../services/branch.service';
import { CreateBranchRequest } from '../../models/branch.models';
import { UserContextService } from '../../services/user-context.service';
import { MasterDataService } from '../../services/master-data.service';
import { OrganizationService } from '../../services/organization.service';
import { MasterLookup, LookupKeys } from '../../models/master-data.models';


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
  states: MasterLookup[] = [];
  isLoadingStates: boolean = false;
  private organizationStateName: string | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private branchService: BranchService,
    private userContext: UserContextService,
    private organizationService: OrganizationService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private masterDataService: MasterDataService
  )
  
  {
    this.branchForm = this.formBuilder.group({
  name: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^[a-zA-Z0-9 ]+$/)]],
  address1: ['', [Validators.required, Validators.maxLength(100)]],
  address2: ['', [Validators.maxLength(100)]],
  city: ['', [Validators.required, Validators.maxLength(100)]],
  state: ['', [Validators.required, Validators.maxLength(100)]],
  country: ['India', [Validators.required]],
  zipCode: ['', [Validators.required, Validators.maxLength(10)]],
  phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
  organizationId: [0]
    });
  }

ngOnInit(): void {
  const organizationId = this.userContext.organizationId;
  if (organizationId) {
    this.branchForm.patchValue({ organizationId });
  }

  this.loadOrganizationState();

  // If editing, load the branch details
  if (this.isEditing && this.editingBranchId) {
    this.loadBranchDetails(this.editingBranchId);
  }

  this.loadStates();
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

    const control = this.branchForm.get('state');
    const currentValue = (control?.value || '').toString().trim();
    if (currentValue) return; // Do not override if already set

    const target = this.organizationStateName.toLowerCase();
    const match = this.states.find(
      s => (s.lookupValue || '').toLowerCase() === target || (s.lookupCode || '').toLowerCase() === target
    );
    if (match) control?.setValue(match.lookupValue);
  }

  private loadStates(): void {
    this.isLoadingStates = true;
    this.masterDataService.getMasterData().subscribe({
      next: (allLookups) => {
        this.states = (allLookups || [])
          .filter(l => l.lookupKey === LookupKeys.State)
          .sort((a, b) => (a.lookupValue || '').localeCompare(b.lookupValue || '', undefined, { sensitivity: 'base' }));
        this.applyOrgStateDefaultIfNeeded();
        this.isLoadingStates = false;
      },
      error: () => {
        this.states = [];
        this.isLoadingStates = false;
      }
    });
  }

  async loadBranchDetails(branchId: number): Promise<void> {
    const loading = await this.loadingController.create({
      message: 'Loading branch details...',
      spinner: 'crescent'
    });
    await loading.present();

    this.branchService.getBranchById(branchId).subscribe({
      next: async (branch) => {
        await loading.dismiss();
        // Populate form with branch details
        this.branchForm.patchValue({
          name: branch.name,
          address1: branch.address1 || '',
          address2: branch.address2 || '',
          city: branch.city,
          state: branch.state,
          country: branch.country || 'India',
          zipCode: branch.zipCode,
          phoneNumber: branch.phoneNumber,
          organizationId: branch.orgId || this.userContext.organizationId
        });
      },
      error: async (error) => {
        await loading.dismiss();
        console.error('Error loading branch details:', error);
        this.showToast('Failed to load branch details', 'danger');
      }
    });
  }

  onNumericInput(event: Event, fieldName: string): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    const numericValue = value.replace(/[^0-9]/g, '');
    if (value !== numericValue) {
      this.branchForm.get(fieldName)?.setValue(numericValue);
    }
  }

  onNameInput(event: Event): void {
    const raw = (event.target as HTMLInputElement)?.value ?? '';
    const sanitized = (raw || '').replace(/[^a-zA-Z0-9 ]/g, '');
    const truncated = sanitized.slice(0, 100);
    const control = this.branchForm.get('name');
    if (control && control.value !== truncated) {
      control.setValue(truncated);
    }
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;
    
    // Mark all fields as touched to show validation errors
    Object.keys(this.branchForm.controls).forEach(key => {
      this.branchForm.get(key)?.markAsTouched();
    });

    if (this.branchForm.invalid) {
      this.focusFirstInvalidField();
      this.showToast('Please fill in all required fields correctly', 'danger');
      return;
    }

    // Check for duplicate branch name before submission
    if (this.isDuplicateBranchName()) {
      this.showToast('Branch name already exists. Please choose a different name.', 'danger');
      this.focusField('name');
      return;
    }

    const loading = await this.loadingController.create({
      message: this.isEditing ? 'Updating branch...' : 'Creating branch...',
      spinner: 'crescent'
    });
    await loading.present();

    const address1 = this.branchForm.value.address1?.trim() || '';
    const address2 = this.branchForm.value.address2?.trim() || '';

    const branchData = {
      name: this.branchForm.value.name.trim(),
      address1: address1,
      address2: address2,
      city: this.branchForm.value.city?.trim() || '',
      state: this.branchForm.value.state?.trim() || '',
      country: this.branchForm.value.country || 'India',
      zipCode: this.branchForm.value.zipCode?.trim() || '',
      phoneNumber: this.branchForm.value.phoneNumber?.trim() || '',
      organizationId: this.branchForm.value.organizationId
    } as CreateBranchRequest;

    // Call update or create based on editing mode
    const serviceCall = this.isEditing && this.editingBranchId
      ? this.branchService.updateBranch(this.editingBranchId, branchData)
      : this.branchService.createBranch(branchData);

    serviceCall.subscribe({
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
        console.error('Error saving branch:', error);
        
        // Handle backend validation errors (like duplicate names)
        if (error.status === 409 || error.error?.message?.includes('already exists')) {
          this.showToast('Branch name already exists. Please choose a different name.', 'danger');
          this.focusField('name');
        } else {
          this.showToast('Failed to save branch. Please try again.', 'danger');
        }
      }
    });
  }

  private isDuplicateBranchName(): boolean {
    const nameToCheck = this.branchForm.value.name?.trim().toLowerCase();
    if (!nameToCheck) return false;

    return this.branches.some(branch => 
      branch.name.toLowerCase() === nameToCheck &&
      branch.id !== this.editingBranchId
    );
  }

  private focusFirstInvalidField(): void {
    const fieldOrder = ['name', 'address1', 'address2', 'city', 'state', 'country', 'zipCode', 'phoneNumber'];
    
    for (const fieldName of fieldOrder) {
      const field = this.branchForm.get(fieldName);
      if (field && field.invalid) {
        setTimeout(() => {
          this.focusField(fieldName);
        }, 100);
        break;
      }
    }
  }

  private focusField(fieldName: string): void {
    const selectors = [
      `ion-input[name="${fieldName}"] input`,
      `ion-select[name="${fieldName}"]`,
      `input[name="${fieldName}"]`,
      `[formControlName="${fieldName}"] input`,
      `[formControlName="${fieldName}"]`
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        element.focus();
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    const field = this.branchForm.get(fieldName);
    if (field && field.invalid && (field.touched || this.submitted)) {
      if (field.errors?.['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (field.errors?.['maxlength']) {
        if (fieldName === 'address1' || fieldName === 'address2') {
          return `${this.getFieldLabel(fieldName)} must be at most 100 characters`;
        }
        if (fieldName === 'name') {
          return 'Branch name must be at most 100 characters';
        }
      }
      if (field.errors?.['pattern']) {
        if (fieldName === 'phoneNumber') {
          return 'Please enter exactly 10 digits';
        }
        if (fieldName === 'name') {
          return 'Branch name must be alphanumeric';
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
      address1: 'Address 1',
      address2: 'Address 2',
      city: 'City',
      state: 'State',
      zipCode: 'Zip Code',
      phoneNumber: 'Phone number',
      email: 'Email'
    };
    return labels[fieldName] || fieldName;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.branchForm.get(fieldName);
    return !!(field && field.invalid && (field.touched || this.submitted));
  }

  get isSavedDisabled(): boolean {
    if (this.branchForm.invalid) {
      return true;
    }

    const requiredFields = ['name', 'address1', 'city', 'state', 'country', 'zipCode', 'phoneNumber'];
    for (const fieldName of requiredFields) {
      const value = this.branchForm.get(fieldName)?.value;
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        return true;
      }
    }   
    return false; 
  }
}

