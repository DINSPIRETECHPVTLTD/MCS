import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter, ModalController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { BranchService } from '../../services/branch.service';
import { Branch } from '../../models/branch.models';
import { AddPocModalComponent } from './add-poc-modal.component';

@Component({
  selector: 'app-pocs',
  templateUrl: './pocs.page.html',
  styleUrls: ['./pocs.page.scss']
})
export class PocsPage implements OnInit, ViewWillEnter {
  activeMenu: string = 'POCs';
  pocs: any[] = [];
  selectedBranch: Branch | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private modalController: ModalController
  ) { }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
  }

  ionViewWillEnter(): void {
    // Reload data when page becomes active
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    // TODO: Load POCs data here when API is ready
  }

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

  onBranchChange(branch: Branch): void {
    console.log('Branch changed to:', branch);
    this.selectedBranch = branch;
  }

  async openAddPocModal(): Promise<void> {
    const modal = await this.modalController.create({
      component: AddPocModalComponent,
      componentProps: {
        isEditing: false,
        branchId: this.selectedBranch?.id || null
      },
      cssClass: 'add-modal'
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data && data.success) {
      // TODO: Reload POCs list when API is available
      console.log('POC created successfully:', data.data);
      // this.loadPocs();
    }
  }
}

