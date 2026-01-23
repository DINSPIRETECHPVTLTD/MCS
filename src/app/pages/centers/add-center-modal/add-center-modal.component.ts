  import { Component, Input } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { CenterService } from 'src/app/services/center.service';

@Component({
  selector: 'app-add-center-modal',
  templateUrl: './add-center-modal.component.html',
  styleUrls: ['./add-center-modal.component.scss']
})
export class AddCenterModalComponent {
    clearForm() {
      this.centerName = '';
      this.address = '';
      this.city = '';
      this.pinCode = '';
      this.formSubmitted = false;
    }
  @Input() branch: any;

  centerName: string = '';
  address: string = '';
  city: string = '';
  pinCode: string = '';
  isSaving: boolean = false;
  formSubmitted: boolean = false;

  constructor(
    private modalController: ModalController,
    private centerService: CenterService,
    private toastController: ToastController
  ) {}

  closeModal() {
    this.modalController.dismiss();
  }

  async saveCenter(form: any) {
    this.formSubmitted = true;
    if (!this.centerName || !this.address || !this.city || !this.pinCode) {
      await this.showToast('Please fill all fields');
      return;
    }
    this.isSaving = true;
    const centerData = {
      name: this.centerName,
      address: this.address,
      city: this.city,
      pinCode: this.pinCode,
      branchId: this.branch?.id
    };
    this.centerService.addCenter(centerData).subscribe({
      next: async () => {
        this.isSaving = false;
        await this.showToast('Saved successfully');
        this.closeModal();
      },
      error: async () => {
        this.isSaving = false;
        await this.showToast('Data not saved');
      }
    });
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color: 'success',
      position: 'top'
    });
    toast.present();
  }
}
