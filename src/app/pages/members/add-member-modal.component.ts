import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidatorFn, ValidationErrors } from '@angular/forms';
import { ModalController, LoadingController, ToastController } from '@ionic/angular';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil, distinctUntilChanged } from 'rxjs/operators';
import { MemberService } from '../../services/member.service';
import { UserService } from '../../services/user.service';
import { MasterDataService } from '../../services/master-data.service';
import { MasterLookup, LookupKeys } from '../../models/master-data.models';
import { CenterOption, POCOption } from '../../models/member.models';

@Component({
  selector: 'app-add-member-modal',
  templateUrl: './add-member-modal.component.html',
  styleUrls: ['./add-member-modal.component.scss']
})
export class AddMemberModalComponent implements OnInit, OnDestroy {
  // ...existing properties...


  memberForm: FormGroup;
  /** Relationship options from master data (RELATIONSHIP), with "Other" added if not present */
  relationships: MasterLookup[] = [];
  isSubmitting = false;
  isLoading = false;
  submitted = false;
  todayString: string = new Date().toISOString().split('T')[0];

  centers: CenterOption[] = [];
  pocs: POCOption[] = [];
  collectors: any[] = [];
  states: MasterLookup[] = [];
  isLoadingStates = false;
  isLoadingRelationships = false;
  private organizationStateName: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private memberService: MemberService,
    private userService: UserService,
    private masterDataService: MasterDataService,
    private modalController: ModalController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef
  ) {
    this.memberForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadOrganizationStateFromStorage();
    this.loadAllCenters();
    this.loadStates();
    this.loadRelationships();
    this.setupFormListeners();
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
    const stateControl = this.memberForm.get('state');
    if (!stateControl || (stateControl.value || '').toString().trim()) return;
    const target = this.organizationStateName.toLowerCase();
    const match = this.states.find(
      s => (s.lookupValue || '').toLowerCase() === target || (s.lookupCode || '').toLowerCase() === target
    );
    if (match) {
      stateControl.setValue(match.lookupCode);
      this.cdr.detectChanges();
    }
  }

  loadRelationships(): void {
    this.isLoadingRelationships = true;
    this.masterDataService.getMasterData().subscribe({
      next: (allLookups) => {
        const list = allLookups
          .filter(lookup => lookup.lookupKey === LookupKeys.Relationship)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        const hasOther = list.some(l => (l.lookupValue || '').toLowerCase() === 'other');
        this.relationships = hasOther ? list : [...list, { lookupKey: 'RELATIONSHIP', lookupCode: 'Other', lookupValue: 'Other', sortOrder: 9999, isActive: true } as MasterLookup];
        this.isLoadingRelationships = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading relationships:', error);
        this.relationships = [{ lookupKey: 'RELATIONSHIP', lookupCode: 'Other', lookupValue: 'Other', sortOrder: 0, isActive: true } as MasterLookup];
        this.isLoadingRelationships = false;
        this.cdr.detectChanges();
      }
    });
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
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading states:', error);
        this.states = [];
        this.isLoadingStates = false;
        this.cdr.detectChanges();
      }
    });
  }

  ionViewWillEnter(): void {
    if (!this.centers || this.centers.length === 0) {
      this.loadAllCenters();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.formBuilder.group(
      {
        centerId: ['', Validators.required],
        pocId: ['', Validators.required],
        firstName: ['', [Validators.required, Validators.maxLength(50), this.alphanumericValidator()]],
        lastName: ['', [Validators.required, Validators.maxLength(50), this.alphanumericValidator()]],
        dateOfBirth: ['', [Validators.required, this.noFutureDateValidator(), this.minimumAgeValidator(18)]],
        age: [{ value: '', disabled: true }],
        phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
        address1: ['', [Validators.required, Validators.maxLength(200)]],
        address2: ['', [Validators.maxLength(200)]],
        city: ['', [Validators.required, Validators.maxLength(100), this.alphanumericValidator()]],
        state: ['', [Validators.required, Validators.maxLength(100)]],
        zipCode: ['', [Validators.required, Validators.maxLength(6), Validators.minLength(6), Validators.pattern(/^[0-9]{6}$/)]],
        aadhaar: ['', [Validators.required, Validators.pattern(/^\d{12}$/)]],
        occupation: ['', [Validators.required, Validators.maxLength(100)]],
        guardianFirstName: ['', [Validators.required, Validators.maxLength(100), this.alphanumericValidator()]],
        guardianLastName: ['', [Validators.required, Validators.maxLength(100), this.alphanumericValidator()]],
        guardianRelationship: ['', [Validators.required]],
        guardianRelationshipOther: ['', [Validators.maxLength(100), this.alphanumericValidator()]],
        guardianPhone: ['', [Validators.pattern(/^\d{10}$/)]],
        guardianDOB: ['', [Validators.required, this.noFutureDateValidator()]],
        guardianAge: ['', [Validators.min(18), Validators.max(150)]],
        paymentMode: ['', [Validators.required]],
        paymentAmount: ['', [Validators.required, Validators.min(0)]],
        paymentDate: ['', [Validators.required, this.noFutureDateValidator()]],
        collectedBy: ['', [Validators.required]],
        paymentComments: ['', [Validators.maxLength(500)]]
      },
      {
        validators: [this.uniquePhoneNumbersValidator(['phoneNumber', 'guardianPhone'])]
      }
    );
  }

  // Load branches from service


  // Load all centers from service
  loadAllCenters(): void {
    this.isLoading = true;
    this.memberService.getAllCenters().subscribe({
      next: (centers: CenterOption[]) => {
        this.centers = centers ?? [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.centers = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Load collectors (users) for the selected center
  private loadCollectorsForCenter(centerId: number): void {
    const selectedCenter = this.centers.find(c => Number(c.id) === centerId);
    if (!selectedCenter) return;

    const branchId = selectedCenter.branchId;
    if (!branchId) {
      this.collectors = [];
      return;
    }

    // Fetch all users and filter by branch
    this.userService.getUsers().subscribe({
      next: (users: any[]) => {
        this.collectors = (users ?? [])
          .filter(user => user && Number(user.branchId) === branchId)
          .map(user => ({
            id: user.id,
            name: (user.name || [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ')).trim(),
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        this.cdr.detectChanges();
      },
      error: () => {
        this.collectors = [];
        this.cdr.detectChanges();
      }
    });
  }

  // Setup form listeners for value changes
  setupFormListeners(): void {
    this.memberForm.get('phoneNumber')?.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(value => {
        const sanitized = this.sanitizeDigits(value, 10);
        if (value !== sanitized) {
          this.memberForm.patchValue({ phoneNumber: sanitized }, { emitEvent: false });
        }
      });

    this.memberForm.get('guardianPhone')?.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(value => {
        const sanitized = this.sanitizeDigits(value, 10);
        if (value !== sanitized) {
          this.memberForm.patchValue({ guardianPhone: sanitized }, { emitEvent: false });
        }
      });

    this.memberForm.get('aadhaar')?.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(value => {
        const sanitized = this.sanitizeDigits(value, 12);
        if (value !== sanitized) {
          this.memberForm.patchValue({ aadhaar: sanitized }, { emitEvent: false });
        }
      });

    this.memberForm.get('guardianDOB')?.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(dob => {
        const dobString = (dob ?? '').toString();
        if (dobString && !isNaN(new Date(dobString).getTime())) {
          const age = this.calculateAge(dobString);
          this.memberForm.patchValue({ guardianAge: age }, { emitEvent: false });
        }
      });

    this.memberForm.get('guardianRelationship')?.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(value => {
        const otherControl = this.memberForm.get('guardianRelationshipOther');
        if (!otherControl) return;

        if (value === 'Other') {
          otherControl.setValidators([Validators.required, Validators.maxLength(100), this.alphanumericValidator()]);
        } else {
          otherControl.clearValidators();
          otherControl.setValidators([Validators.maxLength(100), this.alphanumericValidator()]);
          otherControl.setValue('', { emitEvent: false });
        }
        otherControl.updateValueAndValidity({ emitEvent: false });
      });



    this.memberForm.get('centerId')?.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(centerId => {
        const selectedCenterId = Number(centerId);
        if (selectedCenterId) {
          this.memberForm.patchValue({ pocId: '', collectedBy: '' });
          // Fetch POCs for the selected center
          this.memberService.getAllPOCs().subscribe(pocs => {
            // Filter POCs by centerId if needed, or use API that supports centerId
            this.pocs = pocs
              .filter(poc => Number(poc.centerId) === selectedCenterId)
              .map(poc => ({
                ...poc,
                name: (poc.name || [poc.firstName, poc.middleName, poc.lastName].filter(Boolean).join(' ')).trim()
              }));
          });
          
          // Fetch collectors (users) for the selected center's branch
          this.loadCollectorsForCenter(selectedCenterId);
        } else {
          this.pocs = [];
          this.collectors = [];
          this.memberForm.patchValue({ pocId: '', collectedBy: '' });
        }
      });

    this.memberForm.get('dateOfBirth')?.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(dob => {
        if (dob && !isNaN(new Date(dob).getTime())) {
          const age = this.calculateAge(dob);
          this.memberForm.patchValue({ age }, { emitEvent: false });
        } else {
          this.memberForm.patchValue({ age: '' }, { emitEvent: false });
        }
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

  private altPhoneDifferentFromPrimaryValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const altPhone = (control.value ?? '').toString();
      if (!altPhone) return null;

      const primaryPhone = (control.parent?.get('phoneNumber')?.value ?? '').toString();
      if (!primaryPhone) return null;

      return altPhone === primaryPhone ? { sameAsPrimary: true } : null;
    };
  }

  private uniquePhoneNumbersValidator(fields: string[]): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      if (!group || typeof (group as any).get !== 'function') return null;

      const form = group as FormGroup;
      const values: Array<{ field: string; value: string }> = [];

      for (const field of fields) {
        const control = form.get(field);
        const raw = (control?.value ?? '').toString();
        const normalized = raw.replace(/\D/g, '');
        if (normalized) {
          values.push({ field, value: normalized });
        }
      }

      const duplicateFields = new Set<string>();
      for (let i = 0; i < values.length; i++) {
        for (let j = i + 1; j < values.length; j++) {
          if (values[i].value === values[j].value) {
            duplicateFields.add(values[i].field);
            duplicateFields.add(values[j].field);
          }
        }
      }

      // Apply/clear per-control error without clobbering other errors
      for (const field of fields) {
        const control = form.get(field);
        if (!control) continue;

        const shouldHaveError = duplicateFields.has(field);
        const currentErrors = control.errors ?? {};

        if (shouldHaveError) {
          if (!currentErrors['phoneNotUnique']) {
            control.setErrors({ ...currentErrors, phoneNotUnique: true });
          }
        } else if (currentErrors['phoneNotUnique']) {
          const { phoneNotUnique, ...rest } = currentErrors as any;
          const nextErrors = Object.keys(rest).length ? rest : null;
          control.setErrors(nextErrors);
        }
      }

      return duplicateFields.size ? { phoneNotUnique: true } : null;
    };
  }

  // Custom validator: only letters and spaces
  alphanumericValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      return /^[a-zA-Z\s]*$/.test(control.value) ? null : { alphanumeric: true };
    };
  }

  // Custom validator: no future dates
  noFutureDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const date = new Date(control.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date <= today ? null : { futureDate: true };
    };
  }

  // Custom validator: minimum age
  minimumAgeValidator(minAge: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const dob = new Date(control.value);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      return age >= minAge ? null : { minAge: true };
    };
  }

  // Calculate age from DOB
  calculateAge(dob: string): number {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  private sanitizeDigits(value: any, maxLen: number): string {
    const digits = (value ?? '').toString().replace(/\D/g, '');
    return digits.slice(0, maxLen);
  }

  // --- Add methods here ---
  // onSave(), onCancel(), onClear(), isFieldInvalid(), getFieldError(), etc.
  // setupFormListeners(), setupAadhaarValidation(), calculateAge(), etc.

    async onSave(): Promise<void> {
      this.submitted = true;
      if (this.memberForm.invalid) {
        this.memberForm.markAllAsTouched();
        this.scrollToFirstInvalidField();

        const toast = await this.toastController.create({
          message: 'Please fill details.',
          duration: 1500,
          color: 'success',
          position: 'top',
          icon: 'alert-circle-outline',
          cssClass: 'app-toast app-toast--cleared'
        });
        await toast.present();
        return;
      }
      this.isSubmitting = true;
      const loading = await this.loadingController.create({ message: 'Saving member...' });
      await loading.present();
      try {
        const raw = this.memberForm.getRawValue();

        const selectedCenterId = Number(raw.centerId);
        const selectedCenter = this.centers.find(c => Number(c.id) === selectedCenterId);
        if (!selectedCenter) {
          await loading.dismiss();
          const toast = await this.toastController.create({
            message: 'Please select a valid center.',
            duration: 2000,
            color: 'warning'
          });
          await toast.present();
          return;
        }

        const ageValue = raw.age ? Number(raw.age) : this.calculateAge(raw.dateOfBirth);
        const guardianPhone = (raw.guardianPhone ?? '').toString();
        const relationshipSelection = (raw.guardianRelationship ?? '').toString();
        const guardianRelationship =
          relationshipSelection === 'Other'
            ? (raw.guardianRelationshipOther ?? '').toString().trim()
            : relationshipSelection;

        const payload = {
          firstName: (raw.firstName ?? '').toString().trim(),
          middleName: (raw.middleName ?? '').toString().trim() || null,
          lastName: (raw.lastName ?? '').toString().trim(),
          phoneNumber: (raw.phoneNumber ?? '').toString(),
          altPhone: (raw.altPhone ?? '').toString() || null,
          address1: (raw.address1 ?? '').toString() || null,
          address2: (raw.address2 ?? '').toString() || null,
          city: (raw.city ?? '').toString() || null,
          state: (raw.state ?? '').toString() || null,
          zipCode: (raw.zipCode ?? '').toString() || null,
          aadhaar: (raw.aadhaar ?? '').toString() || null,
          dob: raw.dateOfBirth ? this.formatDateForApi(raw.dateOfBirth) : null,
          age: ageValue,
          guardianFirstName: (raw.guardianFirstName ?? '').toString().trim(),
          guardianMiddleName: (raw.guardianMiddleName ?? '').toString().trim() || null,
          guardianLastName: (raw.guardianLastName ?? '').toString().trim(),
          guardianPhone,
          guardianDOB: raw.guardianDOB ? this.formatDateForApi(raw.guardianDOB) : null,
          guardianAge: Number(raw.guardianAge),
          guardianRelationship: guardianRelationship || null,
          centerId: selectedCenterId,
          pocId: Number(raw.pocId),
          occupation: (raw.occupation ?? '').toString().trim(),
          paymentMode: (raw.paymentMode ?? '').toString() || null,
          paymentAmount: raw.paymentAmount ? Number(raw.paymentAmount) : null,
          paymentDate: raw.paymentDate ? this.formatDateForApi(raw.paymentDate) : null,
          collectedBy: raw.collectedBy ? Number(raw.collectedBy) : null,
          paymentComments: (raw.paymentComments ?? '').toString().trim() || null
        };

        const created = await firstValueFrom(this.memberService.createMember(payload as any));
        await loading.dismiss();
        const toast = await this.toastController.create({
          message: 'Member has been successfully registered.',
          duration: 2500,
          color: 'success',
          position: 'top',
          icon: 'checkmark-circle-outline',
          cssClass: 'app-toast app-toast--success'
        });
        await toast.present();
        this.modalController.dismiss({ success: true, member: created });
      } catch (error) {
        console.error('Failed to create member', error);
        await loading.dismiss();

        const err: any = error as any;
        const backendMessage =
          err?.error?.message ||
          err?.error?.title ||
          (typeof err?.error === 'string' ? err.error : '') ||
          '';

        const toast = await this.toastController.create({
          message: backendMessage
            ? `Failed to add member: ${backendMessage}`
            : 'Failed to add member. Please try again.',
          duration: 2500,
          color: 'danger',
          position: 'top',
          icon: 'close-circle-outline',
          cssClass: 'app-toast app-toast--danger'
        });
        await toast.present();
      } finally {
        this.isSubmitting = false;
      }
    }

    private scrollToFirstInvalidField(): void {
      setTimeout(() => {
        const invalid = document.querySelector('.add-member-content .ion-invalid, .add-member-content .ng-invalid') as HTMLElement | null;
        if (!invalid) return;

        const field = invalid.closest('ion-item') ?? invalid;
        field.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 0);
    }

    async onCancel(): Promise<void> {
      await this.modalController.dismiss(false);
    }


    isFieldInvalid(field: string): boolean {
      const control = this.memberForm.get(field);
      return !!(control && control.invalid && (control.dirty || control.touched || this.submitted));
    }

    getFieldError(field: string): string {
      const control = this.memberForm.get(field);
      if (!control || !control.errors) return '';
      if (!(control.dirty || control.touched || this.submitted)) return '';
      if (control.errors['required']) return 'This field is required.';
      if (control.errors['maxlength']) return `Maximum length is ${control.errors['maxlength'].requiredLength}.`;
      if (control.errors['phoneNotUnique']) return 'Phone numbers must be different.';
      if (control.errors['sameAsPrimary']) return 'Alternate phone cannot be same as phone number.';
      if (control.errors['pattern']) {
        if (field === 'phoneNumber') return 'Phone number must be exactly 10 digits.';
        if (field === 'altPhone') return 'Alternate phone must be exactly 10 digits.';
        if (field === 'guardianPhone') return 'Guardian phone must be exactly 10 digits.';
        if (field === 'aadhaar') return 'Aadhaar must be exactly 12 digits.';
        if (field === 'zipCode') return 'Zip code must be exactly 6 digits.';
        return 'Invalid format.';
      }
      if (control.errors['alphanumeric']) return 'Only letters and spaces allowed.';
      if (control.errors['futureDate']) return 'Date cannot be in the future.';
      if (control.errors['minAge']) return 'Minimum age required.';
      if (control.errors['min']) return `Minimum value is ${control.errors['min'].min}.`;
      if (control.errors['max']) return `Maximum value is ${control.errors['max'].max}.`;
      return 'Invalid field.';
    }

    private formatDateForApi(value: any): string | null {
      if (!value) return null;
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return value?.toString?.() ?? null;
      const yyyy = date.getFullYear();
      const mm = `${date.getMonth() + 1}`.padStart(2, '0');
      const dd = `${date.getDate()}`.padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }

}
