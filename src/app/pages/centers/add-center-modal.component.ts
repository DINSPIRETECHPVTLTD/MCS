import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, LoadingController, ToastController } from '@ionic/angular';
import { CenterService } from '../../services/center.service';
import { Center, CreateCenterRequest } from '../../models/center.models';

@Component({
    selector: 'app-add-center-modal',
    templateUrl: './add-center-modal.component.html',
    styleUrls: ['./add-center-modal.component.scss']
})
export class AddCenterModalComponent implements OnInit {
    @Input() isEditing: boolean = false;
    @Input() editingCenterId: number | null = null;
    @Input() branchId: number | null = null;

    centerForm: FormGroup;
    submitted: boolean = false;

    constructor(
        private formBuilder: FormBuilder,
        private modalController: ModalController,
        private centerService: CenterService,
        private loadingController: LoadingController,
        private toastController: ToastController
    ) {
        this.centerForm = this.formBuilder.group({
            name: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^[a-zA-Z0-9 ]+$/)]],
            centerAddress: ['', [Validators.maxLength(200)]],
            city: ['', [Validators.maxLength(100)]]
        });
    }

    ngOnInit(): void {
        if (this.isEditing && this.editingCenterId) {
            this.loadCenterDetails(this.editingCenterId);
        }
    }

    async loadCenterDetails(centerId: number): Promise<void> {
        const loading = await this.loadingController.create({
            message: 'Loading center details...',
            spinner: 'crescent'
        });
        await loading.present();

        this.centerService.getCenterById(centerId).subscribe({
            next: async (center) => {
                await loading.dismiss();
                this.centerForm.patchValue({
                    name: center.name,
                    centerAddress: center.centerAddress || '',
                    city: center.city || ''
                });
            },
            error: async (error) => {
                await loading.dismiss();
                console.error('Error loading center details:', error);
                this.showToast('Failed to load center details', 'danger');
            }
        });
    }

    onNameInput(event: Event): void {
        const raw = (event.target as HTMLInputElement)?.value ?? '';
        const sanitized = raw.replace(/[^a-zA-Z0-9 ]/g, '');
        const truncated = sanitized.slice(0, 100);
        const control = this.centerForm.get('name');
        if (control && control.value !== truncated) {
            control.setValue(truncated);
        }
    }

    async onSubmit(): Promise<void> {
        this.submitted = true;

        Object.keys(this.centerForm.controls).forEach(key => {
            this.centerForm.get(key)?.markAsTouched();
        });

        if (this.centerForm.invalid) {
            this.focusFirstInvalidField();
            this.showToast('Please fill in all required fields correctly', 'danger');
            return;
        }

        if (!this.branchId) {
            this.showToast('No branch selected. Please select a branch first.', 'danger');
            return;
        }

        const loading = await this.loadingController.create({
            message: this.isEditing ? 'Updating center...' : 'Creating center...',
            spinner: 'crescent'
        });
        await loading.present();

        const name = this.centerForm.value.name.trim() as string;
        const centerAddress = this.centerForm.value.centerAddress?.trim() || undefined;
        const city = this.centerForm.value.city?.trim() || undefined;

        const serviceCall = this.isEditing && this.editingCenterId
            ? this.centerService.updateCenter(this.editingCenterId, {
                name,
                centerAddress,
                city
            } as Partial<Center>)
            : this.centerService.createCenter({
                name,
                branchId: this.branchId!,
                centerAddress: centerAddress ?? null,
                city: city ?? null
            } as CreateCenterRequest);

        serviceCall.subscribe({
            next: async (center) => {
                await loading.dismiss();
                this.showToast(
                    this.isEditing ? 'Center updated successfully!' : 'Center created successfully!',
                    'success'
                );
                await this.modalController.dismiss({ success: true, center });
            },
            error: async (error) => {
                await loading.dismiss();
                console.error('Error saving center:', error);
                if (error.status === 409 || error.error?.message?.includes('already exists')) {
                    this.showToast('Center name already exists. Please choose a different name.', 'danger');
                    this.focusField('name');
                } else {
                    this.showToast('Failed to save center. Please try again.', 'danger');
                }
            }
        });
    }

    private focusFirstInvalidField(): void {
        const fieldOrder = ['name', 'centerAddress', 'city'];
        for (const fieldName of fieldOrder) {
            const field = this.centerForm.get(fieldName);
            if (field && field.invalid) {
                setTimeout(() => this.focusField(fieldName), 100);
                break;
            }
        }
    }

    private focusField(fieldName: string): void {
        const selectors = [
            `ion-input[name="${fieldName}"] input`,
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
        const field = this.centerForm.get(fieldName);
        if (field && field.invalid && (field.touched || this.submitted)) {
            if (field.errors?.['required']) {
                return `${this.getFieldLabel(fieldName)} is required`;
            }
            if (field.errors?.['maxlength']) {
                return `${this.getFieldLabel(fieldName)} is too long`;
            }
            if (field.errors?.['pattern']) {
                if (fieldName === 'name') {
                    return 'Center name must be alphanumeric';
                }
            }
        }
        return '';
    }

    getFieldLabel(fieldName: string): string {
        const labels: { [key: string]: string } = {
            name: 'Center name',
            centerAddress: 'Address',
            city: 'City'
        };
        return labels[fieldName] || fieldName;
    }

    isFieldInvalid(fieldName: string): boolean {
        const field = this.centerForm.get(fieldName);
        return !!(field && field.invalid && (field.touched || this.submitted));
    }

    get isSaveDisabled(): boolean {
        return this.centerForm.invalid || !this.centerForm.get('name')?.value?.trim();
    }
}
