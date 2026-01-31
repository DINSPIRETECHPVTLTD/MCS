import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter, LoadingController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { OrganizationService } from '../../services/organization.service';
import { Organization } from '../../models/organization.models';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomeComponent implements OnInit, ViewWillEnter {
  organization: Organization | null = null;
  activeMenu: string = 'Dashboard';

  constructor(
    private authService: AuthService,
    private organizationService: OrganizationService,
    private router: Router,
    private loadingController: LoadingController
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

    // Try to get organization from login response first
    const orgFromLogin = this.authService.getOrganizationInfo();
    if (orgFromLogin && orgFromLogin.name) {
      this.organization = {
        name: orgFromLogin.name,
        phone: orgFromLogin.phoneNumber,
        city: orgFromLogin.city,
        ...orgFromLogin
      } as Organization;
    } else {
      const organizationId = this.authService.getOrganizationId();
      if (organizationId) {
        // Fetch organization details from API
        this.loadOrganizationDetails(organizationId);
      } else {
        console.warn('Organization ID not available from UserContext');
      }
    }
  }

  async loadOrganizationDetails(organizationId: number): Promise<void> {
    const loading = await this.loadingController.create({
      message: 'Loading organization details...',
      spinner: 'crescent'
    });
    await loading.present();

    // Try primary endpoint first
    this.organizationService.getOrganization(organizationId).subscribe({
      next: (org: Organization) => {
        loading.dismiss();
        this.organization = org;
        localStorage.setItem('organization_info', JSON.stringify(org));
      },
      error: (error: any) => {
        loading.dismiss();
        console.error('Error loading organization:', error);
      }
    });
  }

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

  onBranchChange(branch: Branch): void {
    // Handle branch change if needed
  }
}
