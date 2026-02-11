import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { Center } from '../../models/center.models';
import { CenterService } from '../../services/center.service';

@Component({
  selector: 'app-edit-center-modal',
  templateUrl: './edit-center-modal.component.html',
  styleUrls: ['./edit-center-modal.component.scss']
})
export class EditCenterModalComponent implements OnInit {
  @Input() center!: Center;
  centerForm!: FormGroup;
  isSubmitting = false;

  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private centerService: CenterService
  ) {}

  ngOnInit(): void {
    this.centerForm = this.formBuilder.group({
      centerName: [this.center.centerName, [Validators.required, Validators.maxLength(100)]],
      centerAddress: [this.center.centerAddress, [Validators.required]],
      city: [this.center.city, [Validators.required, Validators.maxLength(50)]],
      // Branch must not be editable during center update.
      branchName: [{ value: this.center.branchName, disabled: true }]
    });
  }

  async onUpdate(): Promise<void> {
    if (this.centerForm.invalid) {
      this.centerForm.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    try {
      const value = this.centerForm.getRawValue();
      const centerName = (value.centerName ?? '').toString().trim();
      const centerAddress = (value.centerAddress ?? '').toString().trim();
      const city = (value.city ?? '').toString().trim();
      const branchName = (this.center.branchName ?? '').toString().trim();

      type UpdateCenterPayload = Partial<Center> & { name?: string; Name?: string };

      // Backend payload keys vary across endpoints in this app (create uses `name`).
      // Send a compatible payload, but return a normalized `Center` back to the page.
      const payload: UpdateCenterPayload = {
        ...this.center,
        name: centerName,
        centerName,
        Name: centerName,
        centerAddress,
        city,
        branchName,
        branchId: this.center.branchId
      };

      await firstValueFrom(this.centerService.updateCenter(this.center.id!, payload));

      const normalized: Center = {
        id: this.center.id,
        centerName,
        centerAddress,
        city,
        branchName,
        branchId: this.center.branchId
      };

      await this.modalController.dismiss({ updated: true, center: normalized });
    } catch (err) {
      // Optionally show error toast here
      this.isSubmitting = false;
    }
    this.isSubmitting = false;
  }

  async onCancel(): Promise<void> {
    await this.modalController.dismiss(false);
  }
}
