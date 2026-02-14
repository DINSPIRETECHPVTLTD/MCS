import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController } from '@ionic/angular';
import { PaymentsService } from '../../services/payments.service';

@Component({
  selector: 'app-add-payment-modal',
  templateUrl: './add-payment-modal.component.html',
  styleUrls: ['./add-payment-modal.component.scss']
})
export class AddPaymentModalComponent {
  paymentForm: FormGroup;
  isSubmitting = false;
  paymentTerms = ['Daily', 'Weekly', 'Monthly'];

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private toastController: ToastController,
    private paymentsService: PaymentsService
  ) {
    this.paymentForm = this.formBuilder.group({
      paymentTerm: ['', Validators.required],
      noOfTerms: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
      processingFee: [''],
      roi: [''],
      insuranceFee: ['']
    });
  }

  dismiss(refresh = false) {
    this.modalController.dismiss({ refresh });
  }

  onCancel() {
    this.dismiss();
  }

  onSubmit() {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    this.paymentsService.addPayment(this.paymentForm.value).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.dismiss(true);
        this.showToast('Payment term added successfully', 'success');
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = err?.error?.message || err?.message || 'Failed to add payment term. Please try again.';
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
