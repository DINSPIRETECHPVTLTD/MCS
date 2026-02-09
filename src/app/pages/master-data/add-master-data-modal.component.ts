import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, LoadingController, ToastController } from '@ionic/angular';
import { MasterDataService } from '../../services/master-data.service';
import { MasterLookup, CreateMasterLookupRequest, LookupKeys } from '../../models/master-data.models';

@Component({
  selector: 'app-add-master-data-modal',
  templateUrl: './add-master-data-modal.component.html',
  styleUrls: ['./add-master-data-modal.component.scss']
})
export class AddMasterDataModalComponent implements OnInit {
  @Input() isEditing = false;
  @Input() editingId: number | null = null;

  form: FormGroup;
  submitted = false;
  lookupKeyOptions: { value: string; label: string }[] = [
    { value: LookupKeys.LoanTerm, label: 'Loan Term (LOAN_TERM)' },
    { value: LookupKeys.PaymentType, label: 'Payment Type (PAYMENT_TYPE)' }
  ];

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private masterDataService: MasterDataService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.form = this.formBuilder.group({
      lookupKey: ['', [Validators.required, Validators.maxLength(100)]],
      lookupCode: ['', [Validators.required, Validators.maxLength(50)]],
      lookupValue: ['', [Validators.required, Validators.maxLength(200)]],
      numericValue: [null as number | null],
      sortOrder: [0, [Validators.required, Validators.min(0)]],
      isActive: [true],
      description: ['']
    });
  }

  ngOnInit(): void {
    if (this.isEditing && this.editingId) {
      this.loadData();
    }
  }

  async loadData(): Promise<void> {
    if (!this.editingId) return;
    const loading = await this.loadingController.create({
      message: 'Loading...',
      spinner: 'crescent'
    });
    await loading.present();
    this.masterDataService.getMasterDataById(this.editingId).subscribe({
      next: async (item) => {
        await loading.dismiss();
        if (item) {
          this.form.patchValue({
            lookupKey: item.lookupKey ?? '',
            lookupCode: item.lookupCode ?? '',
            lookupValue: item.lookupValue ?? '',
            numericValue: item.numericValue ?? null,
            sortOrder: item.sortOrder ?? 0,
            isActive: item.isActive !== false,
            description: item.description ?? ''
          });
        }
      },
      error: async () => {
        await loading.dismiss();
        this.showToast('Failed to load', 'danger');
      }
    });
  }

  closeModal(): void {
    this.modalController.dismiss({ success: false });
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;
    if (this.form.invalid) return;
    const value = this.form.value;
    const request: CreateMasterLookupRequest = {
      lookupKey: value.lookupKey,
      lookupCode: value.lookupCode,
      lookupValue: value.lookupValue,
      numericValue: value.numericValue != null && value.numericValue !== '' ? Number(value.numericValue) : null,
      sortOrder: Number(value.sortOrder) || 0,
      isActive: value.isActive !== false,
      description: value.description || null
    };
    const loading = await this.loadingController.create({
      message: this.isEditing ? 'Updating...' : 'Saving...',
      spinner: 'crescent'
    });
    await loading.present();
    const apiCall = this.isEditing && this.editingId
      ? this.masterDataService.updateMasterData(this.editingId, request)
      : this.masterDataService.createMasterData(request);
    apiCall.subscribe({
      next: async (saved) => {
        await loading.dismiss();
        this.showToast(this.isEditing ? 'Updated successfully' : 'Saved successfully', 'success');
        this.modalController.dismiss({ success: true, data: saved });
      },
      error: async (err) => {
        await loading.dismiss();
        this.showToast(err?.error?.message || 'Failed to save', 'danger');
      }
    });
  }

  async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 3000, color, position: 'top' });
    await toast.present();
  }

  isFieldInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.invalid && (c.dirty || this.submitted));
  }

  getFieldError(field: string): string {
    const c = this.form.get(field);
    if (!c?.errors) return '';
    if (c.errors['required']) return 'Required';
    if (c.errors['min']) return `Min ${c.errors['min'].min}`;
    if (c.errors['maxlength']) return `Max ${c.errors['maxlength'].requiredLength} characters`;
    return 'Invalid';
  }
}
