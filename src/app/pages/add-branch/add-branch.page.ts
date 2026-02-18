import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController, ViewWillEnter } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { BranchService } from '../../services/branch.service';
import { MasterDataService } from '../../services/master-data.service';
import { MasterLookup, LookupKeys } from '../../models/master-data.models';
import { Branch } from '../../models/branch.models';

@Component({
  selector: 'app-add-branch',
  templateUrl: './add-branch.page.html',
  styleUrls: ['./add-branch.page.scss']
})
export class AddBranchComponent implements OnInit, ViewWillEnter {
  branchForm: FormGroup;
  activeMenu: string = 'Add new branch';
  submitted: boolean = false;
  states: MasterLookup[] = [];
  isLoadingStates = false;
  private organizationStateName: string | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private branchService: BranchService,
    private masterDataService: MasterDataService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.branchForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^[a-zA-Z0-9 ]+$/)]],
      address1: ['', [Validators.required, Validators.maxLength(100)]],
      address2: ['', [Validators.required, Validators.maxLength(100)]],
      city: ['', [Validators.required, Validators.maxLength(100)]],
      state: ['', [Validators.required, Validators.maxLength(100)]],
      country: ['India', [Validators.required]],
      zipCode: ['', [Validators.required, Validators.maxLength(10)]],
      phoneNumber: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadOrganizationStateFromStorage();
    this.loadStates();
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
    if (!this.organizationStateName) return;
    const stateControl = this.branchForm.get('state');
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
        this.states = allLookups
          .filter(lookup => lookup.lookupKey === LookupKeys.State)
          .sort((a, b) => (a.lookupValue || '').localeCompare(b.lookupValue || '', undefined, { sensitivity: 'base' }));
        this.isLoadingStates = false;
        this.applyOrgStateDefaultIfNeeded();
      },
      error: (error) => {
        console.error('Error loading states:', error);
        this.states = [];
        this.isLoadingStates = false;
      }
    });
  }

  onNameInput(event: Event): void {
    const raw = (event as CustomEvent)?.detail?.value ?? '';
    const sanitized = (raw || '').replace(/[^a-zA-Z0-9 ]/g, '');
    const truncated = sanitized.slice(0, 100);
    const control = this.branchForm.get('name');
    if (control && control.value !== truncated) {
      control.setValue(truncated);
    }
  }

  ionViewWillEnter(): void {
    // Reload data when page becomes active
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;
    // mark all fields as touched to show validation errors
    Object.keys(this.branchForm.controls).forEach(key => {
      this.branchForm.get(key)?.markAsTouched();
    });

    if (this.branchForm.invalid) {
      this.showToast('Please fill in all required fields', 'danger');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Creating branch...',
      spinner: 'crescent'
    });
    await loading.present();

    // TODO: Implement branch creation API call
    setTimeout(() => {
      loading.dismiss();
      this.showToast('Branch created successfully!', 'success');
      this.branchForm.reset();
    }, 1000);
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

  onBranchChange(_branch: Branch): void {
    // Handle branch change if needed
  }

  getFieldError(fieldName: string): string {
    const field = this.branchForm.get(fieldName);
    if (field && field.invalid && (field.touched || this.submitted)) {
      if (field.errors?.['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (field.errors?.['maxlength']) {
        return `${this.getFieldLabel(fieldName)} must be at most ${field.errors['maxlength'].requiredLength} characters`;
      }
      if (field.errors?.['pattern']) {
        if (fieldName === 'phoneNumber') {
          return 'Please enter a valid 10-digit phone number';
        }
      }
    }
    return '';
  }

  getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Branch name',
      address1: 'Address line 1',
      address2: 'Address line 2',
      city: 'City',
      state: 'State',
      country: 'Country',
      zipCode: 'Zip code',
      phoneNumber: 'Phone number'
    };
    return labels[fieldName] || fieldName;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.branchForm.get(fieldName);
    return !!(field && field.invalid && (field.touched || this.submitted));
  }
}

