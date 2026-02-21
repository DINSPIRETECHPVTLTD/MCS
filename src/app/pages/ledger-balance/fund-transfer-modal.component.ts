import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalController, LoadingController, ToastController, IonicModule } from '@ionic/angular';
import { IonDatetime } from '@ionic/angular';
import { ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { UserService } from '../../services/user.service';
import { User } from 'src/app/models/user.models';
import { CommonModule } from '@angular/common';
import { CreateFundTransferRequest } from 'src/app/models/fund-transfer.models';
import { LedgerBalanceService } from '../../services/ledger-balance.service';

@Component({
  selector: 'app-add-fund-transfer',
  standalone: true,
  imports: [IonicModule, ReactiveFormsModule, DatePipe, CommonModule],
  templateUrl: './fund-transfer-modal.component.html',
  styleUrl: './fund-transfer-modal.component.scss',
  providers: [DatePipe]
})
export class AddFundTransferComponent implements OnInit {

  @ViewChild('datePickerModal') datePickerModal!: IonDatetime;
  fundTransferForm: FormGroup;
  submitted: boolean = false;
  selectedDate: string = new Date().toISOString(); // Initialize with current date
  formattedDate: string | null = null;
  maxDate = '';
  private dateValue: any;
  users: User[] = [];
  

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private datePipe: DatePipe,
    private userService: UserService,
    private ledgerBalanceService: LedgerBalanceService
  ) {

    this.fundTransferForm = this.formBuilder.group({
      fromInvestorName : ['', [Validators.required]],
      toInvestorName : ['', [Validators.required]],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      investmentDate: ['', [Validators.required]]
    });

  }

  ngOnInit(): void {
    // Initialization logic if needed
    this.maxDate = new Date().toLocaleDateString('en-CA'); // Set max date to today in YYYY-MM-DD format
    this.loadUsers();
  }

  loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = (users || []).filter(user => user.role === 'Investor' || user.role === 'Owner');
      },
      error: (error) => {
        console.error('Error loading users:', error);
      }
    });
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;

    Object.keys(this.fundTransferForm.controls).forEach(key => {
      this.fundTransferForm.get(key)?.markAsTouched();
    });

    if (this.fundTransferForm.invalid) {
      this.showToast('Please fill in all required fields correctly', 'danger');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Creating investment...',
      spinner: 'crescent'
    });
    await loading.present();

    const fundTransferData: CreateFundTransferRequest = {
      paidFromUserId: this.fundTransferForm.get('fromInvestorName')?.value,
      paidToUserId: this.fundTransferForm.get('toInvestorName')?.value, // Replace with actual recipient ID
      amount: this.fundTransferForm.value.amount,
      investmentDate: this.fundTransferForm.value.investmentDate
    };

    console.log('Fund transfer data to submit:', fundTransferData); // Debug log

    if(fundTransferData.paidFromUserId && fundTransferData.paidToUserId) {
      this.ledgerBalanceService.createFundTransfer(fundTransferData).subscribe({
        next: async (fundTransfer) => {
          await loading.dismiss();
          this.showToast('Fund transfer created successfully!', 'success');
          await this.modalController.dismiss({ success: true, fundTransfer });
        },
        error: async (error) => {
          await loading.dismiss();
          const errorMessage = error.error?.message || error.message || 'Failed to create fund transfer. Please try again.';
          this.showToast(errorMessage, 'danger');
          console.error('Error creating fund transfer:', error);
        }
      });
    } 
    else
    {
      await loading.dismiss();
      this.showToast('Invalid investor selected. Please try again.', 'danger');

    }
  }

  async closeModal(): Promise<void> {
    await this.modalController.dismiss({ success: false });
  }

  getFieldError(fieldName: string): string {
    const field = this.fundTransferForm.get(fieldName);
    if (field && field.invalid && (field.touched || this.submitted)) {
      if (field.errors?.['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (field.errors?.['min']) {
        return `${this.getFieldLabel(fieldName)} must be greater than 0`;
      }
    }
    return '';
  }

  getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      fromInvestorName: 'Sender Name',
      toInvestorName: 'Recipient Name',
      amount: 'Amount',
      investmentDate: 'Investment Date'
    };
    return labels[fieldName] || fieldName;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.fundTransferForm.get(fieldName);
    return !!(field && field.invalid && (field.touched || this.submitted));
  }

  get date(): any {
    return this.dateValue;
  }
  set date(value: any) {
    console.log({ value });
    this.dateValue = value;
    this.fundTransferForm.setValue({ ...this.fundTransferForm.value, investmentDate: value });
  }

  onDateChange(event: any, popover: any) {
    this.date = event.detail.value;
    popover.dismiss();
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


}
