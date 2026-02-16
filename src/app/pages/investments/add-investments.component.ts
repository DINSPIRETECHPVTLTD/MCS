import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalController, LoadingController, ToastController, IonicModule } from '@ionic/angular';
import { InvestmentsService } from '../../services/investments.service';
import { CreateInvestmentRequest } from 'src/app/models/investments.models';
import { IonDatetime } from '@ionic/angular';
import { ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { UserService } from '../../services/user.service';
import { User } from 'src/app/models/user.models';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-add-investments',
  standalone: true,
  imports: [IonicModule, ReactiveFormsModule, DatePipe, CommonModule],
  templateUrl: './add-investments.component.html',
  styleUrl: './add-investments.component.scss',
  providers: [DatePipe]
})
export class AddInvestmentsComponent implements OnInit {

  @ViewChild('datePickerModal') datePickerModal!: IonDatetime;
  investmentForm: FormGroup;
  submitted: boolean = false;
  selectedDate: string = new Date().toISOString(); // Initialize with current date
  formattedDate: string | null = null;
  maxDate = '';
  private dateValue: any;
  users: User[] = [];
  

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private investmentsService: InvestmentsService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private datePipe: DatePipe,
    private userService: UserService
  ) {

    this.investmentForm = this.formBuilder.group({
      investorName : ['', [Validators.required]],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      investmentDate: ['', [Validators.required]]
    });

  }

  ngOnInit(): void {
    // Initialization logic if needed
    this.maxDate = new Date().toISOString();
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

    Object.keys(this.investmentForm.controls).forEach(key => {
      this.investmentForm.get(key)?.markAsTouched();
    });

    if (this.investmentForm.invalid) {
      this.showToast('Please fill in all required fields correctly', 'danger');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Creating investment...',
      spinner: 'crescent'
    });
    await loading.present();

    const investmentData: CreateInvestmentRequest = {
      userId: this.investmentForm.get('investorName')?.value,
      amount: this.investmentForm.value.amount,
      investmentDate: this.investmentForm.value.investmentDate
    };

    console.log('Investment data to submit:', investmentData); // Debug log

    if(investmentData.userId) {
      this.investmentsService.createInvestment(investmentData).subscribe({
        next: async (investment) => {
          await loading.dismiss();
          this.showToast('Investment created successfully!', 'success');
          await this.modalController.dismiss({ success: true, investment });
        },
        error: async (error) => {
          await loading.dismiss();
          const errorMessage = error.error?.message || error.message || 'Failed to create investment. Please try again.';
          this.showToast(errorMessage, 'danger');
          console.error('Error creating investment:', error);
        }
      });
    } 
    else
    {
      await loading.dismiss();
      this.showToast('Invalid investor selected. Please try again.', 'danger');
      console.error('Invalid investor ID:', investmentData.userId);
    }
  }

  async closeModal(): Promise<void> {
    await this.modalController.dismiss({ success: false });
  }

  getFieldError(fieldName: string): string {
    const field = this.investmentForm.get(fieldName);
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
      investorName: 'Investor Name',
      amount: 'Amount',
      investmentDate: 'Investment Date'
    };
    return labels[fieldName] || fieldName;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.investmentForm.get(fieldName);
    return !!(field && field.invalid && (field.touched || this.submitted));
  }

  get date(): any {
    return this.dateValue;
  }
  set date(value: any) {
    console.log({ value });
    this.dateValue = value;
    this.investmentForm.setValue({ ...this.investmentForm.value, investmentDate: value });
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
