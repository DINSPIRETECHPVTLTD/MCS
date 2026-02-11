import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController } from '@ionic/angular';
import { BranchService } from '../../services/branch.service';
import { CenterService } from '../../services/center.service';
import { Branch } from '../../models/branch.models';

@Component({
  selector: 'app-add-center-modal',
  templateUrl: './add-center-modal.component.html',
  styleUrls: ['./add-center-modal.component.scss']
})
export class AddCenterModalComponent implements OnInit {
  centerForm!: FormGroup;
  isSubmitting = false;
  branches: Branch[] = [];
  isBranchLocked = false;

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private toastController: ToastController,
    private branchService: BranchService,
    private centerService: CenterService
  ) {}

  ngOnInit(): void {
    const savedBranchId = this.readSavedBranchId();
    this.isBranchLocked = savedBranchId != null;

    this.centerForm = this.formBuilder.group({
      centerName: ['', [Validators.required, Validators.maxLength(100)]],
      city: ['', [Validators.required, Validators.maxLength(50)]],
      centerAddress: ['', [Validators.required]],
      branchId: [savedBranchId, [Validators.required]]
    });

    if (this.isBranchLocked) {
      this.centerForm.get('branchId')?.disable({ emitEvent: false });
    }

    this.loadBranches();
  }

  private readSavedBranchId(): number | null {
    try {
      const raw = localStorage.getItem('selected_branch_id');
      if (!raw) return null;
      const num = Number(raw);
      return Number.isNaN(num) ? null : num;
    } catch {
      return null;
    }
  }

  private loadBranches(): void {
    this.branchService.getBranches().subscribe({
      next: (branches) => {
        this.branches = branches ?? [];

        // If no branch is preselected, pick the first available.
        const current = this.centerForm.get('branchId')?.disabled
          ? this.readSavedBranchId()
          : this.centerForm.get('branchId')?.value;
        if ((current == null || current === '') && this.branches.length > 0) {
          this.centerForm.patchValue({ branchId: this.branches[0].id });
        }
      },
      error: async () => {
        this.branches = [];
        await this.showToast('Failed to load branches', 'danger');
      }
    });
  }

  async onCreate(): Promise<void> {
    if (this.centerForm.invalid) {
      this.centerForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    try {
      const value = this.centerForm.value;
      const payload = {
        name: (value.centerName ?? '').toString().trim(),
        branchId: Number(this.centerForm.get('branchId')?.disabled ? this.readSavedBranchId() : value.branchId),
        centerAddress: (value.centerAddress ?? '').toString().trim(),
        city: (value.city ?? '').toString().trim()
      };

      const created = await this.centerService.createCenter(payload).toPromise();
      await this.modalController.dismiss({ created: true, center: created });
    } catch (err) {
      await this.showToast('Failed to create center', 'danger');
      this.isSubmitting = false;
      return;
    }

    this.isSubmitting = false;
  }

  async onCancel(): Promise<void> {
    await this.modalController.dismiss({ created: false });
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
