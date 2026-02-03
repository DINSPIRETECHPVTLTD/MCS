import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { MemberService } from '../../services/member.service';
import { CenterOption, POCOption, MemberStatus } from '../../models/member.models';

@Component({
  selector: 'app-edit-member-modal',
  templateUrl: './edit-member-modal.component.html',
  styleUrls: ['./edit-member-modal.component.scss']
})
export class EditMemberModalComponent implements OnInit {
  @Input() memberData: Record<string, any> | null = null;
  @Input() memberId: number | null = null;


  memberForm: FormGroup;
  isSubmitting = false;
  isLoading = false;
  todayString: string = new Date().toISOString().split('T')[0];

  constructor(
    private formBuilder: FormBuilder,
    private memberService: MemberService,
    private modalController: ModalController
  ) {
    this.memberForm = this.createForm();
  }

  ngOnInit(): void {
    // memberData is passed via componentProps from members page (grid row data)
    if (this.memberData) {
        console.log('EditMemberModal - Received member data in oninit:', this.memberData);
      
      // Extract member ID from grid row data
    const memberId = this.memberData['memberId']
    this.isLoading = true;
    // Fetch full member details from API using member ID
    this.memberService.getMemberById(Number(memberId)).subscribe({
        next: (memberDetails) => {
        this.memberData = memberDetails as any;
        console.log('Fetched member detailsfrom API:', this.memberData);
        this.populateFormWithMemberData();
        this.isLoading = false;
        },
        error: (error) => {
        console.error('Failed to load member details:', error);
        // Fallback: use grid data if API fails
        this.populateFormWithMemberData();
        this.isLoading = false;
        }
    });
    }
  }

  private createForm(): FormGroup {
    return this.formBuilder.group({
      memberId: [{ value: '', disabled: true }],
      firstName: ['', [Validators.required, Validators.maxLength(50)]],
      middleName: ['', [Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.maxLength(50)]],
      dateOfBirth: [''],
      age: ['', [Validators.required, Validators.min(18), Validators.max(100)]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      altPhone: ['', [Validators.pattern(/^\d{10}$/)]],
      address1: ['', [Validators.required, Validators.maxLength(200)]],
      address2: ['', [Validators.maxLength(200)]],
      city: ['', [Validators.required, Validators.maxLength(100)]],
      state: ['', [Validators.required, Validators.maxLength(100)]],
      zipCode: ['', [Validators.required, Validators.maxLength(6), Validators.minLength(6)]],
      aadhaar: ['', [Validators.required, Validators.pattern(/^\d{12}$/)]],
      occupation: ['', [Validators.maxLength(100)]],
      status: ['', Validators.required],
      guardianFirstName: ['', [Validators.required, Validators.maxLength(100)]],
      guardianMiddleName: ['', [Validators.maxLength(100)]],
      guardianLastName: ['', [Validators.required, Validators.maxLength(100)]],
      guardianPhone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      guardianDOB: [''],
      guardianAge: ['', [Validators.required, Validators.min(18), Validators.max(150)]],
      centerName: ['', Validators.required],
      pocName: ['', Validators.required],
      pocContactNumber: ['', Validators.required]
    });
  }

  private populateFormWithMemberData(): void {
    if (!this.memberData) {
      console.warn('EditMemberModal - No member data provided');
      return;
    }

    const m = this.memberData;
    console.log('Populating form with member:', m);
    
    this.memberForm.patchValue({
      memberId: m['id'] || '',
      firstName: m['firstName'] || '',
      middleName: m['middleName'] || '',
      lastName: m['lastName'] || '',
      dateOfBirth: m['dob'] || '',
      age: m['age'] || '',
      phoneNumber: m['phoneNumber'] || '',
      altPhone: m['altPhone'] || '',
      address1: m['address1'] || '',
      address2: m['address2'] || '',
      city: m['city'] || '',
      state: m['state'] || '',
      zipCode: m['zipCode'] || '',
      aadhaar: m['aadhaar'] || '',
      status: m['isDeleted'] ? 'Inactive' : 'Active',
      occupation: m['occupation'] || '',
      guardianFirstName: m['guardianFirstName'] || '',
      guardianMiddleName: m['guardianMiddleName'] || '',
      guardianLastName: m['guardianLastName'] || '',
      guardianPhone: m['guardianPhone'] || '',
      guardianDOB: m['guardianDOB'] || '',
      guardianAge: m['guardianAge'] || '',
      centerName: m['center']['name'] || '',
      pocName: m['poc']['firstName'] + ' ' + m['poc']['middleName'] + ' ' + m['poc']['lastName'] || '',
      pocContactNumber: m['pocContactNumber'] || ''
    });
  }

  openNativeDatePicker(input: HTMLInputElement | null): void {
    if (!input) return;
    const picker = (input as HTMLInputElement & { showPicker?: () => void }).showPicker;
    if (typeof picker === 'function') {
      picker.call(input);
    } else {
      input.focus();
    }
  }

  async onSave(): Promise<void> {
    // TODO: Implement member update API call
  }

  async onCancel(): Promise<void> {
    await this.modalController.dismiss(false);
  }

  async onClear(): Promise<void> {
    this.memberForm.reset({ status: 'Active', age: '' });
    this.memberForm.markAsPristine();
    this.memberForm.markAsUntouched();
    this.memberForm.updateValueAndValidity();
  }

  isFieldInvalid(field: string): boolean {
    const control = this.memberForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getFieldError(field: string): string {
    const control = this.memberForm.get(field);
    if (!control || !control.errors) return '';
    if (!(control.dirty || control.touched)) return '';
    if (control.errors['required']) return 'This field is required.';
    if (control.errors['maxlength']) return `Maximum ${control.errors['maxlength'].requiredLength} characters.`;
    if (control.errors['minlength']) return `Minimum ${control.errors['minlength'].requiredLength} characters.`;
    if (control.errors['pattern']) return 'Invalid format.';
    if (control.errors['min']) return `Minimum value is ${control.errors['min'].min}.`;
    if (control.errors['max']) return `Maximum value is ${control.errors['max'].max}.`;
    return 'Invalid field.';
  }
}
