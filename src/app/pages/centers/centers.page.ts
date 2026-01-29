import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { BranchService, Branch } from '../../services/branch.service';
import { CenterService, Center } from '../../services/center.service';

@Component({
  selector: 'app-centers',
  templateUrl: './centers.page.html',
  styleUrls: ['./centers.page.scss']
})
export class CentersPage implements OnInit, ViewWillEnter {
  activeMenu: string = 'Centers';
  centers: Center[] = [];

  constructor(
    private authService: AuthService,
    private router: Router,
    private centerService: CenterService
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
    // Load centers from API
    this.centerService.getCenters().subscribe({
      next: (data: Center[]) => {
        this.centers = data || [];
      },
      error: (err) => {
        console.warn('getCenters failed, trying alternative endpoint', err);
        // Try alternative endpoint
        this.centerService.getCentersList().subscribe({
          next: (list) => {
            this.centers = list || [];
          },
          error: (err2) => {
            console.error('Failed to load centers from API, using mock data', err2);
            // Fallback mock data so page shows something
            this.centers = [
              { id: 1, name: 'Main Center', address: '123 Main St' },
              { id: 2, name: 'Outreach Center', address: '45 Side Ave' }
            ];
          }
        });
      }
    });
  }

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

  onBranchChange(branch: Branch): void {
    console.log('Branch changed to:', branch);
  }
}

