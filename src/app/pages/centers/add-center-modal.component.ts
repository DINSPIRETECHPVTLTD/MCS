import { Component, OnDestroy, OnInit, ChangeDetectorRef, Inject, Injectable } from '@angular/core';
import { OverlayContainer } from '@angular/cdk/overlay';
import { Platform } from '@angular/cdk/platform';
import { DOCUMENT } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { LoadingController, ModalController, ToastController } from '@ionic/angular';
import { Subject, firstValueFrom } from 'rxjs';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { CenterService } from '../../services/center.service';
import { CreateCenterRequest } from '../../models/center.models';

@Injectable()
class ModalOverlayContainer extends OverlayContainer {
  constructor(@Inject(DOCUMENT) private doc: Document, private platform: Platform) {
    super(doc, platform);
  }

  protected override _createContainer(): void {
    const container = this.doc.createElement('div');
    container.classList.add('cdk-overlay-container');

    const modal = this.doc.querySelector('ion-modal.add-center-modal');
    if (modal) {
      modal.appendChild(container);
    } else {
      this.doc.body.appendChild(container);
    }

    this._containerElement = container;
  }
}

@Component({
  selector: 'app-add-center-modal',
  templateUrl: './add-center-modal.component.html',
  styleUrls: ['./add-center-modal.component.scss'],
  providers: [{ provide: OverlayContainer, useClass: ModalOverlayContainer }]
})
export class AddCenterModalComponent implements OnInit, OnDestroy {
  centerForm: FormGroup;
  branches: Array<{ id: number; name: string }> = [];

  isSubmitting = false;
  isLoading = false;
  submitted = false;

  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private centerService: CenterService,
    private modalController: ModalController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef
  ) {
    this.centerForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadBranches();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.formBuilder.group({
      centerName: ['', [Validators.required, Validators.maxLength(100), this.alphaNumericSpacesValidator()]],
      centerAddress: ['', [Validators.required]],
      city: ['', [Validators.required, Validators.maxLength(50), this.alphaOnlyValidator()]],
      branchId: [null, [Validators.required]]
    });
  }

  loadBranches(): void {
    this.isLoading = true;
    this.centerService.getBranches().subscribe({
      next: branches => {
        this.branches = branches ?? [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.branches = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  async onSave(): Promise<void> {
    this.submitted = true;

    if (this.centerForm.invalid) {
      this.centerForm.markAllAsTouched();
      this.scrollToFirstInvalidField();
      return;
    }

    this.isSubmitting = true;
    const loading = await this.loadingController.create({ message: 'Saving center...' });
    await loading.present();

    try {
      const raw = this.centerForm.getRawValue();

      const branchId = Number(raw.branchId ?? 0) || 0;
      // Name is shown in the UI, but API requires BranchId for insert
      const branchName = (this.branches.find(b => b.id === branchId)?.name ?? '').toString().trim();

      const payload: CreateCenterRequest = {
        name: (raw.centerName ?? '').toString().trim(),
        branchId,
        centerAddress: (raw.centerAddress ?? '').toString(),
        city: (raw.city ?? '').toString().trim()
      };
      alert('Payload being sent to API:\n' + JSON.stringify(payload, null, 2));
      console.log('CreateCenter POST payload:', payload);

      // Debug: verify the request payload shape at runtime
      console.log('CreateCenter POST payload:', payload);

      await firstValueFrom(this.centerService.createCenter(payload));
      await loading.dismiss();

      const toast = await this.toastController.create({
        message: 'Center added successfully',
        duration: 2500,
        color: 'success',
        position: 'top',
        icon: 'checkmark-circle-outline',
        cssClass: 'app-toast app-toast--success'
      });
      await toast.present();

      await this.modalController.dismiss({ success: true });
    } catch (error) {
      console.error('Failed to create center', error);
      await loading.dismiss();

      const toast = await this.toastController.create({
        message: 'Data was not saved',
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

  async onCancel(): Promise<void> {
    await this.modalController.dismiss(false);
  }

  async onClear(): Promise<void> {
    this.centerForm.reset();
    this.submitted = false;

    this.centerForm.markAsPristine();
    this.centerForm.markAsUntouched();
    this.centerForm.updateValueAndValidity();

    const toast = await this.toastController.create({
      message: 'Data cleared successfully',
      duration: 1500,
      color: 'success',
      position: 'top',
      icon: 'trash-outline',
      cssClass: 'app-toast app-toast--cleared'
    });
    await toast.present();
  }

  isFieldInvalid(field: string): boolean {
    const control = this.centerForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched || this.submitted));
  }

  getFieldError(field: string): string {
    const control = this.centerForm.get(field);
    if (!control || !control.errors) return '';
    if (!(control.dirty || control.touched || this.submitted)) return '';

    if (control.errors['required']) return 'This field is required.';
    if (control.errors['maxlength']) {
      return `Maximum length is ${control.errors['maxlength'].requiredLength}.`;
    }
    if (control.errors['alphaOnly']) return 'Only letters and spaces allowed.';
    if (control.errors['alphaNumericSpaces']) return 'Only letters, numbers and spaces allowed.';

    return 'Invalid field.';
  }

  private scrollToFirstInvalidField(): void {
    setTimeout(() => {
      const invalid = document.querySelector('.add-center-dialog .ng-invalid') as HTMLElement | null;
      if (!invalid) return;

      const field = invalid.closest('.mat-mdc-form-field') as HTMLElement | null;
      (field ?? invalid).scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  }

  private alphaOnlyValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      return /^[a-zA-Z\s]*$/.test(control.value) ? null : { alphaOnly: true };
    };
  }

  private alphaNumericSpacesValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      return /^[a-zA-Z0-9\s]*$/.test(control.value) ? null : { alphaNumericSpaces: true };
    };
  }
}
