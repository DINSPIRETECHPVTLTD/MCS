import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController, LoadingController } from '@ionic/angular';
import { MemberService } from '../../services/member.service';
import { MasterDataService } from '../../services/master-data.service';
import { MasterLookup, LookupKeys } from '../../models/master-data.models';
import { Member, CenterOption, POCOption } from '../../models/member.models';

@Component({
  selector: 'app-edit-member-modal',
  templateUrl: './edit-member-modal.component.html',
  styleUrls: ['./edit-member-modal.component.scss']
})
export class EditMemberModalComponent implements OnInit {
  @Input() memberData: Record<string, unknown> | null = null;
  @Input() memberId: number | null = null;

  memberForm: FormGroup;
  isSubmitting = false;
  isLoading = false;
  states: MasterLookup[] = [];
  isLoadingStates = false;
  todayString: string = new Date().toISOString().split('T')[0];

  centers: CenterOption[] = [];
  pocs: POCOption[] = [];
  
  private currentMember: Member | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private memberService: MemberService,
    private masterDataService: MasterDataService,
    private modalController: ModalController,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {
    this.memberForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadStates();
    // Load centers and POCs
    this.memberService.getAllCenters().subscribe({
      next: (centers: CenterOption[]) => {
        this.centers = centers ?? [];
      },
      error: (_error: unknown) => {
        // Failed to load centers - continue with empty list
      }
    });

    this.memberService.getAllPOCs().subscribe({
      next: (pocs: POCOption[]) => {
        this.pocs = pocs ?? [];
      },
      error: (_error: unknown) => {
        // Failed to load POCs - continue with empty list
      }
    });

    // memberData is passed via componentProps from members page (grid row data)
    if (this.memberData) {
      // Extract member ID from grid row data
      const memberId = this.memberData['memberId'];
      this.isLoading = true;
      // Fetch full member details from API using member ID
      this.memberService.getMemberById(Number(memberId)).subscribe({
        next: (memberDetails: Member) => {
          this.currentMember = memberDetails;
          this.populateFormWithMemberData();
          this.isLoading = false;
        },
        error: (_error: unknown) => {
          // Fallback: use grid data if API fails
          this.populateFormWithMemberData();
          this.isLoading = false;
        }
      });
    }
  }

  loadStates(): void {
    this.isLoadingStates = true;
    this.masterDataService.getMasterData().subscribe({
      next: (allLookups) => {
        this.states = allLookups
          .filter(lookup => lookup.lookupKey === LookupKeys.State)
          .sort((a, b) => (a.lookupValue || '').localeCompare(b.lookupValue || '', undefined, { sensitivity: 'base' }));
        this.isLoadingStates = false;
      },
      error: (error) => {
        console.error('Error loading states:', error);
        this.states = [];
        this.isLoadingStates = false;
      }
    });
  }

  private createForm(): FormGroup {
    return this.formBuilder.group({
      memberId: [{ value: '', disabled: true }],
      centerId: ['', Validators.required],
      pocId: ['', Validators.required],
      firstName: ['', [Validators.required, Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.maxLength(50)]],
      dateOfBirth: ['', [Validators.required]],
      age: ['', [Validators.required, Validators.min(18), Validators.max(100)]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      address1: ['', [Validators.required, Validators.maxLength(200)]],
      address2: ['', [Validators.maxLength(200)]],
      city: ['', [Validators.required, Validators.maxLength(100)]],
      state: ['', [Validators.required, Validators.maxLength(100)]],
      zipCode: ['', [Validators.required, Validators.maxLength(6), Validators.minLength(6)]],
      aadhaar: ['', [Validators.required, Validators.pattern(/^\d{12}$/)]],
      occupation: ['', [Validators.required, Validators.maxLength(100)]],
      guardianFirstName: ['', [Validators.required, Validators.maxLength(100)]],
      guardianLastName: ['', [Validators.required, Validators.maxLength(100)]],
      guardianPhone: ['', [Validators.pattern(/^(\d{10})?$/)]],
      guardianDOB: ['', [Validators.required]],
      guardianAge: ['', [Validators.min(18), Validators.max(150)]]
    });
  }

  private populateFormWithMemberData(): void {
    const memberToUse = this.currentMember || this.memberData;
    if (!memberToUse) {
      return;
    }

    const m = memberToUse as Record<string, unknown>;
    
    this.memberForm.patchValue({
      memberId: m['id'] || '',
      centerId: m['centerId'] || '',
      pocId: m['pocId'] || '',
      firstName: m['firstName'] || '',
      lastName: m['lastName'] || '',
      dateOfBirth: m['dob'] || '',
      age: m['age'] || '',
      phoneNumber: m['phoneNumber'] || '',
      address1: m['address1'] || '',
      address2: m['address2'] || '',
      city: m['city'] || '',
      state: m['state'] || '',
      zipCode: m['zipCode'] || '',
      aadhaar: m['aadhaar'] || '',
      occupation: m['occupation'] || '',
      guardianFirstName: m['guardianFirstName'] || '',
      guardianLastName: m['guardianLastName'] || '',
      guardianPhone: m['guardianPhone'] || '',
      guardianDOB: m['guardianDOB'] || '',
      guardianAge: m['guardianAge'] || ''
    });
  }

  openNativeDatePicker(input: HTMLInputElement | null): void {
    if (!input) return;
    const picker = (input as HTMLInputElement & { showPicker?: () => void }).showPicker;
    if (typeof picker === 'function') {
      picker.call(input);
    } else {
      input.focus();
    }
  }

  async onSave(): Promise<void> {
    if (!this.memberForm.valid) {
      const toast = await this.toastController.create({
        message: 'Please fill all required fields correctly',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Updating member...'
    });
    await loading.present();

    try {
      const memberToUse = this.currentMember || this.memberData;
      const memberId = (memberToUse as Record<string, unknown>)?.['id'] || (memberToUse as Record<string, unknown>)?.['memberId'];
      const formValue = this.memberForm.getRawValue();

      const memberPayload = {
        firstName: formValue.firstName || '',
        lastName: formValue.lastName || '',
        dob: formValue.dateOfBirth || '',
        age: formValue.age || 0,
        phoneNumber: formValue.phoneNumber || '',
        address1: formValue.address1 || '',
        address2: formValue.address2 || '',
        city: formValue.city || '',
        state: formValue.state || '',
        zipCode: formValue.zipCode || '',
        aadhaar: formValue.aadhaar || '',
        occupation: formValue.occupation || '',
        guardianFirstName: formValue.guardianFirstName || '',
        guardianLastName: formValue.guardianLastName || '',
        guardianPhone: (formValue.guardianPhone || '').trim() || '-',
        guardianDOB: formValue.guardianDOB || '',
        guardianAge: formValue.guardianAge || 0,
        centerId: formValue.centerId || '',
        pocId: formValue.pocId || ''
      };

      this.memberService.updateMember(Number(memberId), memberPayload).subscribe({
        next: async (_response: unknown) => {
          await loading.dismiss();
          const toast = await this.toastController.create({
            message: 'Member updated successfully',
            duration: 2000,
            color: 'success'
          });
          await toast.present();
          await this.modalController.dismiss(true);
        },
        error: async (_error: unknown) => {
          await loading.dismiss();
          const err: any = _error as any;
          let errorMessage = '';

          // Try to get detailed validation errors from backend
          if (err?.error?.errors && typeof err.error.errors === 'object') {
            // ASP.NET Core validation errors format
            const fieldErrors = Object.entries(err.error.errors)
              .map(([field, messages]: any) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
              .join('\n');
            errorMessage = fieldErrors;
          } else {
            // Fallback to generic error messages
            errorMessage =
              err?.error?.message ||
              err?.error?.title ||
              (typeof err?.error === 'string' ? err.error : '') ||
              '';
          }

          console.log('Member update validation errors:', err?.error?.errors);

          const toast = await this.toastController.create({
            message: errorMessage
              ? `Failed to update member:\n${errorMessage}`
              : 'Failed to update member. One or more validation errors occurred.',
            duration: 3500,
            color: 'danger'
          });
          await toast.present();
        }
      });
    } catch (error) {
      await loading.dismiss();
      const toast = await this.toastController.create({
        message: 'An error occurred',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  async onCancel(): Promise<void> {
    await this.modalController.dismiss(false);
  }

  async onClear(): Promise<void> {
    this.memberForm.reset({ age: '' });
    this.memberForm.markAsPristine();
    this.memberForm.markAsUntouched();
    this.memberForm.updateValueAndValidity();
  }

  isFieldInvalid(field: string): boolean {
    const control = this.memberForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getFieldError(field: string): string {
    const control = this.memberForm.get(field);
    if (!control || !control.errors) return '';
    if (!(control.dirty || control.touched)) return '';
    if (control.errors['required']) return 'This field is required.';
    if (control.errors['maxlength']) return `Maximum ${control.errors['maxlength'].requiredLength} characters.`;
    if (control.errors['minlength']) return `Minimum ${control.errors['minlength'].requiredLength} characters.`;
    if (control.errors['pattern']) return 'Invalid format.';
    if (control.errors['min']) return `Minimum value is ${control.errors['min'].min}.`;
    if (control.errors['max']) return `Maximum value is ${control.errors['max'].max}.`;
    return 'Invalid field.';
  }
}
