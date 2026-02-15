import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController } from '@ionic/angular';
import { PaymentsService } from '../../services/payments.service';
import { Payment } from '../../models/payment.models';

@Component({
  selector: 'app-payment-term-modal',
  templateUrl: './payment-term-modal.component.html',
  styleUrls: ['./payment-term-modal.component.scss']
})
export class PaymentTermModalComponent implements OnInit {
  @Input() payment?: Payment;
  @Input() readOnly = false;
  
  paymentForm!: FormGroup;
  isSubmitting = false;
  isEditMode = false;

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private toastController: ToastController,
    private paymentsService: PaymentsService
  ) {}

  ngOnInit(): void {
    this.isEditMode = !!this.payment;
    
    this.paymentForm = this.formBuilder.group({
      paymentTermName: [
        { value: this.payment?.paymentTermName ?? 'Weekly', disabled: this.readOnly }, 
        Validators.required
      ],
      paymentType: [
        { value: this.payment?.paymentType ?? '', disabled: this.readOnly }
      ],
      noOfTerms: [
        { value: this.payment?.noOfTerms ?? '', disabled: this.readOnly }, 
        [Validators.required, Validators.min(1)]
      ],
      processingFee: [
        { value: this.payment?.processingFee ?? '', disabled: this.readOnly }
      ],
      rateOfInterest: [
        { value: this.payment?.rateOfInterest ?? '', disabled: this.readOnly }
      ],
      insuranceFee: [
        { value: this.payment?.insuranceFee ?? '', disabled: this.readOnly }
      ]
    });
  }

  get modalTitle(): string {
    if (this.readOnly) return 'View Payment Term';
    return this.isEditMode ? 'Edit Payment Term' : 'Add Payment Term';
  }

  get submitButtonText(): string {
    return this.isEditMode ? 'Update Payment Term' : 'Save Payment Term';
  }

  dismiss(refresh = false) {
    this.modalController.dismiss({ refresh });
  }

  onCancel() {
    this.dismiss();
  }

  onSubmit() {
    if (this.paymentForm.invalid || this.readOnly) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formValue = this.paymentForm.getRawValue();

    // Convert string values to numbers
    const noOfTerms = formValue.noOfTerms ? parseInt(formValue.noOfTerms, 10) : 0;
    const processingFee = formValue.processingFee ? parseFloat(formValue.processingFee) : undefined;
    const rateOfInterest = formValue.rateOfInterest ? parseFloat(formValue.rateOfInterest) : undefined;
    const insuranceFee = formValue.insuranceFee ? parseFloat(formValue.insuranceFee) : undefined;

    if (this.isEditMode && this.payment) {
      // Update existing payment - merge form values with existing payment data
      const updatedPayment: Payment = {
        ...this.payment,
        paymentTermName: formValue.paymentTermName,
        paymentType: formValue.paymentType,
        noOfTerms,
        processingFee,
        rateOfInterest,
        insuranceFee
      };
      this.paymentsService.updatePayment(this.payment.id, updatedPayment).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.dismiss(true);
          this.showToast('Payment term updated successfully', 'success');
        },
        error: (err) => {
          this.isSubmitting = false;
          const msg = err?.error?.message || err?.message || 'Failed to update payment term. Please try again.';
          this.showToast(msg, 'danger');
        }
      });
    } else {
      // Add new payment - create complete Payment object
      const newPayment: Payment = {
        id: 0,
        isDeleted: false,
        paymentTermName: formValue.paymentTermName,
        paymentType: formValue.paymentType,
        noOfTerms,
        processingFee,
        rateOfInterest,
        insuranceFee
      };
      this.paymentsService.addPayment(newPayment).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.dismiss(true);
          this.showToast('Payment term added successfully', 'success');
        },
        error: (err) => {
          this.isSubmitting = false;
          const msg = err?.error?.message || err?.message || 'Failed to add payment term. Please try again.';
          console.error('Add payment error:', err);
          this.showToast(msg, 'danger');
        }
      });
    }
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
