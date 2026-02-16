import { Component, OnInit, Input } from '@angular/core';
import { ModalController, LoadingController, ToastController, AlertController } from '@ionic/angular';
import { Member, CenterOption } from '../../models/member.models';
import { CreateLoanRequest, Loan } from '../../models/loan.models';
import { LoanService } from '../../services/loan.service';
import { Poc, PocService } from '../../services/poc.service';
import { Payment } from '../../models/payment.models';
import { PaymentsService } from '../../services/payments.service';
import { MemberService } from '../../services/member.service';

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
  memberPoc: Poc | null = null;
  paymentTerms: Payment[] = [];
  selectedPaymentTerm: Payment | null = null;
  selectedPaymentType: string = '';
  memberCenter: CenterOption | null = null;

  constructor(
    private modalController: ModalController,
    private loanService: LoanService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController,
    private pocService: PocService,
    private paymentsService: PaymentsService,
    private memberService: MemberService
  ) {}

  ngOnInit(): void {
    if (this.selectedMember) {
      const id = this.selectedMember.memberId ?? this.selectedMember.id;
      this.loanForm.memberId = id != null ? Number(id) : 0;
      // Load POC data for the selected member
      this.loadMemberPoc();
      // Load center data for the selected member
      this.loadMemberCenter();
    }
    // Set default disbursement date to today
    const today = new Date();
    this.loanForm.disbursementDate = this.formatDate(today);
    // Set default collection start date to disbursement date + 7 days
    this.updateCollectionStartDate();
    // Load payment terms
    this.loadPaymentTerms();
  }

  loadMemberPoc(): void {
    if (!this.selectedMember?.pocId) return;
    
    this.pocService.getPocs().subscribe({
      next: (pocs: Poc[]) => {
        this.memberPoc = pocs.find(p => p.id === this.selectedMember.pocId) || null;
        // Auto-populate collection term from POC's collection frequency
        if (this.memberPoc?.collectionFrequency) {
          this.loanForm.collectionTerm = this.memberPoc.collectionFrequency;
        }
      },
      error: (err) => {
        console.error('Error loading POC:', err);
        this.memberPoc = null;
      }
    });
  }

  loadPaymentTerms(): void {
    this.paymentsService.getPayments().subscribe({
      next: (payments: Payment[]) => {
        this.paymentTerms = payments;
      },
      error: (err) => {
        console.error('Error loading payment terms:', err);
        this.paymentTerms = [];
      }
    });
  }

  loadMemberCenter(): void {
    if (!this.selectedMember?.centerId) return;
    
    this.memberService.getAllCenters().subscribe({
      next: (centers: CenterOption[]) => {
        this.memberCenter = centers.find(c => c.id === this.selectedMember.centerId) || null;
      },
      error: (err) => {
        console.error('Error loading center:', err);
        this.memberCenter = null;
      }
    });
  }

  get showCollectionDay(): boolean {
    return !!(this.memberPoc && 
             this.memberPoc.collectionFrequency && 
             this.memberPoc.collectionFrequency.toLowerCase() === 'weekly' &&
             this.memberPoc.collectionDay);
  }

  get centerName(): string {
    return this.memberCenter?.name || 'N/A';
  }

  get pocName(): string {
    if (!this.memberPoc) return 'N/A';
    const firstName = this.memberPoc.firstName || '';
    const lastName = this.memberPoc.lastName || '';
    return [firstName, lastName].filter(Boolean).join(' ') || 'N/A';
  }

  get collectionDayMismatchError(): string | null {
    if (!this.memberPoc?.collectionDay || !this.loanForm.collectionStartDate) {
      return null;
    }

    // Parse date as local date to avoid timezone issues
    const dateParts = this.loanForm.collectionStartDate.split('-');
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed
    const day = parseInt(dateParts[2], 10);
    const collectionDate = new Date(year, month, day);
    
    const dayOfWeek = collectionDate.toLocaleDateString('en-US', { weekday: 'long' });
    const pocDay = this.memberPoc.collectionDay.trim();

    if (dayOfWeek.toLowerCase() !== pocDay.toLowerCase()) {
      return `Collection start date must be a ${pocDay}. Selected date is ${dayOfWeek}.`;
    }

    return null;
  }

  get uniquePaymentTypes(): string[] {
    const types = this.paymentTerms
      .map(pt => pt.paymentType)
      .filter(type => type && type.trim() !== '');
    return [...new Set(types)];
  }

  comparePaymentTerms(p1: Payment, p2: Payment): boolean {
    return p1 && p2 ? p1.id === p2.id : p1 === p2;
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
      (f.noOfTerms ?? 0) > 0 &&
      !this.collectionDayMismatchError
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
        
        // Extract error details from response
        let errorTitle = 'Error';
        let errorMessage = 'Failed to create loan. Please try again.';
        
        if (err && typeof err === 'object' && 'error' in err) {
          const errorResponse = (err as any).error;
          if (errorResponse) {
            // Extract error and message fields
            if (errorResponse.error) {
              errorTitle = errorResponse.error;
            }
            if (errorResponse.message) {
              errorMessage = errorResponse.message;
            }
          }
        }
        
        // Show alert with error details
        const alert = await this.alertController.create({
          header: errorTitle,
          message: errorMessage,
          buttons: [
            {
              text: 'OK',
              handler: () => {
                // Close modal after error alert
                this.modalController.dismiss(null, 'error');
              }
            }
          ],
          cssClass: 'error-alert',
          backdropDismiss: false
        });
        await alert.present();
      }
    });
  }

  onNumericInput(event: any, fieldName: keyof CreateLoanRequest): void {
    const input = event.target as HTMLInputElement;
    if (input && input.value) {
      input.value = input.value.replace(/[^0-9.]/g, '');
      const numValue = parseFloat(input.value) || 0;
      (this.loanForm[fieldName] as number) = numValue;
      
      // Recalculate fees when loan amount changes
      if (fieldName === 'loanAmount') {
        this.calculateLoanDetails();
      }
    }
  }

  onPaymentTypeChange(): void {
    // Update selected payment term when payment type changes
    if (this.selectedPaymentType) {
      this.selectedPaymentTerm = this.paymentTerms.find(
        pt => pt.paymentType === this.selectedPaymentType
      ) || null;
    } else {
      this.selectedPaymentTerm = null;
    }
    this.calculateLoanDetails();
  }

  onPaymentTermChange(): void {
    this.calculateLoanDetails();
  }

  calculateLoanDetails(): void {
    if (!this.selectedPaymentTerm || !this.loanForm.loanAmount) {
      return;
    }

    const loanAmount = this.loanForm.loanAmount;
    const paymentTerm = this.selectedPaymentTerm;

    // Calculate Interest Amount = (rateOfInterest * loanAmount) / 100
    this.loanForm.interestAmount = paymentTerm.rateOfInterest 
      ? (paymentTerm.rateOfInterest * loanAmount) / 100 
      : 0;

    // Calculate Processing Fee = (processingFee * loanAmount) / 100
    this.loanForm.processingFee = paymentTerm.processingFee 
      ? (paymentTerm.processingFee * loanAmount) / 100 
      : 0;

    // Calculate Insurance Fee = (insuranceFee * loanAmount) / 100
    this.loanForm.insuranceFee = paymentTerm.insuranceFee 
      ? (paymentTerm.insuranceFee * loanAmount) / 100 
      : 0;

    // Set No of Terms from payment term
    this.loanForm.noOfTerms = paymentTerm.noOfTerms || 0;

    // Calculate Total Amount = loanAmount + interestAmount
    this.loanForm.totalAmount = loanAmount + this.loanForm.interestAmount;
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
