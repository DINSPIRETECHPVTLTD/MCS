import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController, ViewWillEnter } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { BranchService } from '../../services/branch.service';
import { Branch } from '../../models/branch.models';

@Component({
  selector: 'app-add-branch',
  templateUrl: './add-branch.page.html',
  styleUrls: ['./add-branch.page.scss']
})
export class AddBranchPage implements OnInit, ViewWillEnter {
  branchForm: FormGroup;
  activeMenu: string = 'Add new branch';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private branchService: BranchService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.branchForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^[a-zA-Z0-9 ]+$/)]],
      address: [''],
      city: [''],
      state: [''],
      phone: [''],
      email: ['']
    });
  }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
  }

  onNameInput(event: any): void {
    const raw = event?.detail?.value ?? '';
    const sanitized = (raw || '').replace(/[^a-zA-Z0-9 ]/g, '');
    const truncated = sanitized.slice(0, 100);
    const control = this.branchForm.get('name');
    if (control && control.value !== truncated) {
      control.setValue(truncated);
    }
  }

  ionViewWillEnter(): void {
    // Reload data when page becomes active
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
  }

  async onSubmit(): Promise<void> {
    if (this.branchForm.invalid) {
      this.showToast('Please fill in all required fields', 'danger');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Creating branch...',
      spinner: 'crescent'
    });
    await loading.present();

    // TODO: Implement branch creation API call
    setTimeout(() => {
      loading.dismiss();
      this.showToast('Branch created successfully!', 'success');
      this.branchForm.reset();
    }, 1000);
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

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

  onBranchChange(branch: Branch): void {
    console.log('Branch changed to:', branch);
  }
}

