import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-centers',
  templateUrl: './centers.page.html',
  styleUrls: ['./centers.page.scss']
})
export class CentersComponent implements OnInit, ViewWillEnter {
  activeMenu: string = 'Centers';
  centers: any[] = [];

  constructor(
    private authService: AuthService,
    private router: Router
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
  }
}

