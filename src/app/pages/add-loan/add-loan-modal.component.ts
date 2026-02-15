import { Component, OnInit, Input } from '@angular/core';
import { ModalController, LoadingController, ToastController, AlertController } from '@ionic/angular';
import { Member } from '../../models/member.models';
import { CreateLoanRequest, Loan } from '../../models/loan.models';
import { LoanService } from '../../services/loan.service';

@Component({
  selector: 'app-add-loan-modal',
  templateUrl: './add-loan-modal.component.html',
  styleUrls: ['./add-loan-modal.component.scss']
})
export class AddLoanModalComponent implements OnInit {
  @Input() selectedMember!: Member;
  
  loanForm: CreateLoanRequest = {
    memberId: 0,
    loanAmount: 0,
    interestAmount: 0,
    processingFee: 0,
    insuranceFee: 0,
    isSavingEnabled: false,
    savingAmount: 0,
    totalAmount: 0,
    disbursementDate: undefined,
    collectionStartDate: undefined,
    collectionTerm: '',
    noOfTerms: 0
  };
  
  isCreatingLoan: boolean = false;

  constructor(
    private modalController: ModalController,
    private loanService: LoanService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit(): void {
    if (this.selectedMember) {
      const id = this.selectedMember.memberId ?? this.selectedMember.id;
      this.loanForm.memberId = id != null ? Number(id) : 0;
    }
    // Set default disbursement date to today
    const today = new Date();
    this.loanForm.disbursementDate = this.formatDate(today);
    // Set default collection start date to disbursement date + 7 days
    this.updateCollectionStartDate();
  }

  closeModal(): void {
    this.modalController.dismiss(null, 'cancel');
  }

  isLoanFormValid(): boolean {
    const f = this.loanForm;
    return !!(
      f.memberId > 0 &&
      (f.loanAmount ?? 0) > 0 &&
      (f.totalAmount ?? 0) > 0 &&
      (f.collectionTerm ?? '').trim() &&
      (f.noOfTerms ?? 0) > 0
    );
  }

  async createLoan(): Promise<void> {
    if (!this.isLoanFormValid() || this.isCreatingLoan) return;
    
    this.isCreatingLoan = true;
    const loading = await this.loadingController.create({
      message: 'Creating loan...',
      spinner: 'crescent'
    });
    await loading.present();

    this.loanService.createLoan(this.loanForm).subscribe({
      next: async (loan: Loan) => {
        await loading.dismiss();
        this.isCreatingLoan = false;
        
        // Get member name
        const memberName = `${this.selectedMember.firstName || ''} ${this.selectedMember.lastName || ''}`.trim() || 'Member';
        
        // Show alert with member name and loan ID
        const alert = await this.alertController.create({
          header: 'Loan Created Successfully',
          message: `Member: ${memberName} loan created with Loan ID: ${loan.id}`,
          buttons: [
            {
              text: 'OK',
              handler: () => {
                // Close modal and return to add loan page
                this.modalController.dismiss({ loan, reset: true }, 'success');
              }
            }
          ],
          backdropDismiss: false
        });
        await alert.present();
      },
      error: async (err: unknown) => {
        await loading.dismiss();
        this.isCreatingLoan = false;
        console.error('Create loan error:', err);
        
        const toast = await this.toastController.create({
          message: 'Failed to create loan. Please try again.',
          duration: 3000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      }
    });
  }

  onNumericInput(event: any, fieldName: keyof CreateLoanRequest): void {
    const input = event.target as HTMLInputElement;
    if (input && input.value) {
      input.value = input.value.replace(/[^0-9.]/g, '');
      const numValue = parseFloat(input.value) || 0;
      (this.loanForm[fieldName] as number) = numValue;
    }
  }

  onDisbursementDateChange(): void {
    this.updateCollectionStartDate();
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private updateCollectionStartDate(): void {
    if (this.loanForm.disbursementDate) {
      const disbursementDate = new Date(this.loanForm.disbursementDate);
      const collectionDate = new Date(disbursementDate);
      collectionDate.setDate(collectionDate.getDate() + 7);
      this.loanForm.collectionStartDate = this.formatDate(collectionDate);
    }
  }
}
