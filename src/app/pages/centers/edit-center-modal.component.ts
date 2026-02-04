import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
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
      branchName: [this.center.branchName, [Validators.required]]
    });
  }

  async onUpdate(): Promise<void> {
    if (this.centerForm.invalid) {
      this.centerForm.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    try {
      const updated = { ...this.center, ...this.centerForm.value, Name: this.centerForm.value.centerName };
      delete updated.centerName;
      const result = await this.centerService.updateCenter(updated.id!, updated).toPromise();
      await this.modalController.dismiss({ updated: true, center: result });
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
