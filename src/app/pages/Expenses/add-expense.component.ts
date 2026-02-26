import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalController, LoadingController, ToastController, IonicModule } from '@ionic/angular';
import { ExpensesService } from 'src/app/services/expenses.service';
import { CreateExpenseRequest } from 'src/app/models/expenses.models';
import { IonDatetime } from '@ionic/angular';
import { ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { UserService } from '../../services/user.service';
import { User } from 'src/app/models/user.models';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-add-expense',
  standalone: true,
  imports: [IonicModule, ReactiveFormsModule, DatePipe, CommonModule],
  templateUrl: './add-expense.component.html',
  styleUrl: './add-expense.component.scss',
  providers: [DatePipe]
})
export class AddExpensesComponent implements OnInit {

  @ViewChild('datePickerModal') datePickerModal!: IonDatetime;
  expenseForm: FormGroup;
  submitted: boolean = false;
  selectedDate: string = new Date().toISOString(); // Initialize with current date
  formattedDate: string | null = null;
  maxDate = '';
  private dateValue: any;
  users: User[] = [];
  

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private expensesService: ExpensesService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private datePipe: DatePipe,
    private userService: UserService
  ) {

    this.expenseForm = this.formBuilder.group({
      userName : ['', [Validators.required]],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      comment: ['', [Validators.maxLength(500)]],
      expenseDate: ['', [Validators.required]]
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
        this.users = (users || []).filter(user => user.role === 'Owner');
      },
      error: (error) => {
        console.error('Error loading users:', error);
      }
    });
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;

    Object.keys(this.expenseForm.controls).forEach(key => {
      this.expenseForm.get(key)?.markAsTouched();
    });

    if (this.expenseForm.invalid) {
      this.showToast('Please fill in all required fields correctly', 'danger');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Creating expense...',
      spinner: 'crescent'
    });
    await loading.present();

    const expenseData: CreateExpenseRequest = {
      userId: this.expenseForm.get('userName')?.value,
      amount: this.expenseForm.value.amount,
      expenseDate: this.expenseForm.value.expenseDate,
      comment: this.expenseForm.value.comment
    };

    console.log('Expense data to submit:', expenseData); // Debug log

    if(expenseData.userId) {
      this.expensesService.createExpense(expenseData).subscribe({
        next: async (expense) => {
          await loading.dismiss();
          this.showToast('Expense created successfully!', 'success');
          await this.modalController.dismiss({ success: true, expense });
        },
        error: async (error) => {
          await loading.dismiss();
          const errorMessage = error.error?.message || error.message || 'Failed to create expense. Please try again.';
          this.showToast(errorMessage, 'danger');
          console.error('Error creating expense:', error);
        }
      });
    } 
    else
    {
      await loading.dismiss();
      this.showToast('Invalid user selected. Please try again.', 'danger');
      console.error('Invalid user ID:', expenseData.userId);
    }
  }

  async closeModal(): Promise<void> {
    await this.modalController.dismiss({ success: false });
  }

  getFieldError(fieldName: string): string {
    const field = this.expenseForm.get(fieldName);
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
      userName: 'User Name',
      amount: 'Amount',
      comment : 'Comment',
      expenseDate: 'Expense Date'
    };
    return labels[fieldName] || fieldName;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.expenseForm.get(fieldName);
    return !!(field && field.invalid && (field.touched || this.submitted));
  }

  get date(): any {
    return this.dateValue;
  }
  set date(value: any) {
    console.log({ value });
    this.dateValue = value;
    this.expenseForm.setValue({ ...this.expenseForm.value, expenseDate: value });
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
