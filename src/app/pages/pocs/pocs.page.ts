import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { Branch } from '../../models/branch.models';

@Component({
  selector: 'app-pocs',
  templateUrl: './pocs.page.html',
  styleUrls: ['./pocs.page.scss']
})
export class PocsComponent implements OnInit, ViewWillEnter {
  activeMenu: string = 'POCs';
  pocs: any[] = [];

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
    // TODO: Load POCs data here when API is ready
  }

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

  onBranchChange(branch: Branch): void {
  }
}

