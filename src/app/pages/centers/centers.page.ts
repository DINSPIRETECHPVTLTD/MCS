import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter, ModalController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { BranchService } from '../../services/branch.service';
import { Branch } from '../../models/branch.models';

@Component({
  selector: 'app-centers',
  templateUrl: './centers.page.html',
  styleUrls: ['./centers.page.scss']
})
export class CentersPage implements OnInit, ViewWillEnter {
  activeMenu: string = 'Centers';
  centers: any[] = [];
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
    // TODO: Load centers data here when API is ready
  }

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

  onBranchChange(branch: Branch): void {
    this.selectedBranch = branch;
    console.log('Branch changed to:', branch);
  }

  async openAddCenterModal() {
    const modal = await this.modalController.create({
      component: AddCenterModalComponent,
      componentProps: {
        branch: this.selectedBranch
      }
    });
    await modal.present();
  }
}


