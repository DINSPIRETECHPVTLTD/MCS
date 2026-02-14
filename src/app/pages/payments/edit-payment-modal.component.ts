import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController } from '@ionic/angular';
import { PaymentsService } from '../../services/payments.service';
import { Payment } from '../../models/payment.models';


@Component({
  selector: 'app-edit-payment-modal',
  templateUrl: './edit-payment-modal.component.html',
  styleUrls: ['./edit-payment-modal.component.scss']
})
export class EditPaymentModalComponent implements OnInit {
  @Input() payment!: Payment;
  @Input() readOnly = false;
  paymentForm!: FormGroup;
  isSubmitting = false;
  paymentTerms = ['Daily', 'Weekly', 'Monthly'];

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private toastController: ToastController,
    private paymentsService: PaymentsService
  ) {}

  ngOnInit(): void {
    if (!this.payment) {
      this.dismiss();
      return;
    }
    this.paymentForm = this.formBuilder.group({
      paymentTerm: [{ value: this.payment.paymentTerm, disabled: this.readOnly }, Validators.required],
      noOfTerms: [{ value: this.payment.noOfTerms, disabled: this.readOnly }, [Validators.required, Validators.pattern('^[0-9]+$')]],
      processingFee: [{ value: this.payment.processingFee, disabled: this.readOnly }],
      roi: [{ value: this.payment.roi, disabled: this.readOnly }],
      insuranceFee: [{ value: this.payment.insuranceFee, disabled: this.readOnly }]
    });
  }

  dismiss(refresh = false) {
    this.modalController.dismiss({ refresh });
  }

  onCancel() {
    this.dismiss();
  }

  onSubmit() {
    if (!this.payment || this.paymentForm.invalid || this.readOnly) {
      this.paymentForm.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    this.paymentsService.updatePayment(this.payment.id, this.paymentForm.getRawValue()).subscribe({
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
