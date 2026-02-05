import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, LoadingController, ToastController } from '@ionic/angular';
import { UserContextService } from '../../services/user-context.service';
import { BranchService } from '../../services/branch.service';
import { PocService, CreatePocRequest } from '../../services/poc.service';
import { MemberService } from '../../services/member.service';

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
    private pocService: PocService,
    private memberService: MemberService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.pocForm = this.formBuilder.group({
      firstName: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^[a-zA-Z ]+$/)]],
      middleName: ['', [Validators.maxLength(100), Validators.pattern(/^[a-zA-Z ]+$/)]],
      lastName: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^[a-zA-Z ]+$/)]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      altPhone: ['', [Validators.pattern(/^[0-9]{10}$/)]],
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
            middleName: poc.middleName || '',
            lastName: poc.lastName,
            phoneNumber: poc.phoneNumber,
            altPhone: poc.altPhone || '',
            address1: poc.address1 || '',
            address2: poc.address2 || '',
            city: poc.city || '',
            state: poc.state || '',
            zipCode: poc.zipCode || '',
            country: poc.country || 'India',
            centerId: poc.centerId
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
    
    this.memberService.getCentersByBranch(branchId).subscribe({
      next: (centers) => {
        this.centers = centers.map(center => ({
          id: center.id,
          name: center.name,
          branchId: center.branchId
        }));
        this.isLoadingCenters = false;
        console.log('Loaded centers:', this.centers);
      },
      error: (error) => {
        console.error('Error loading centers:', error);
        this.centers = [];
        this.isLoadingCenters = false;
        this.showToast('Failed to load centers. Please try again.', 'danger');
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
      return;
    }

    const loading = await this.loadingController.create({
      message: this.isEditing ? 'Updating POC...' : 'Creating POC...',
      spinner: 'crescent'
    });
    await loading.present();

    const pocData: CreatePocRequest = {
      firstName: this.pocForm.value.firstName.trim(),
      middleName: this.pocForm.value.middleName?.trim() || '',
      lastName: this.pocForm.value.lastName.trim(),
      phoneNumber: this.pocForm.value.phoneNumber?.trim() || '',
      altPhone: this.pocForm.value.altPhone?.trim() || '',
      address1: this.pocForm.value.address1?.trim() || '',
      address2: this.pocForm.value.address2?.trim() || '',
      city: this.pocForm.value.city?.trim() || '',
      state: this.pocForm.value.state?.trim() || '',
      zipCode: this.pocForm.value.zipCode?.trim() || '',
      country: this.pocForm.value.country?.trim() || 'India',
      centerId: this.pocForm.value.centerId
      
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
