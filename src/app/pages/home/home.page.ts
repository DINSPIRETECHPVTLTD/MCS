import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { OrganizationService, Organization } from '../../services/organization.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {
  organization: Organization | null = null;
  userEmail: string = '';
  activeMenu: string = 'Dashboard';
  showUsersSubmenu: boolean = false;

  constructor(
    private authService: AuthService,
    private organizationService: OrganizationService,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) { }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    // Get user info
    const userInfo = this.authService.getUserInfo();
    this.userEmail = userInfo?.email || '';

    // Try to get organization from login response first
    const orgFromLogin = this.authService.getOrganizationInfo();
    if (orgFromLogin && orgFromLogin.name) {
      this.organization = {
        name: orgFromLogin.name,
        phone: orgFromLogin.phone,
        city: orgFromLogin.city,
        ...orgFromLogin
      } as Organization;
    } else {
      // Fetch organization details from API
      this.loadOrganizationDetails();
    }
  }

  async loadOrganizationDetails(): Promise<void> {
    const loading = await this.loadingController.create({
      message: 'Loading organization details...',
      spinner: 'crescent'
    });
    await loading.present();

    // Try primary endpoint first
    this.organizationService.getOrganizationDetails().subscribe({
      next: (org) => {
        loading.dismiss();
        this.organization = org;
        localStorage.setItem('organization_info', JSON.stringify(org));
      },
      error: (error) => {
        // Try alternative endpoint
        this.organizationService.getOrganizationInfo().subscribe({
          next: (org) => {
            loading.dismiss();
            this.organization = org;
            localStorage.setItem('organization_info', JSON.stringify(org));
          },
          error: (err) => {
            loading.dismiss();
            console.error('Error loading organization:', err);
            // Set default values if API fails
            this.organization = {
              name: 'Navya Micro Credit Services',
              phone: '+91 9898123123',
              city: 'Hyderabad'
            } as Organization;
          }
        });
      }
    });
  }

  setActiveMenu(menu: string): void {
    if (menu === 'Users') {
      this.showUsersSubmenu = !this.showUsersSubmenu;
    } else {
      this.showUsersSubmenu = false;
      this.activeMenu = menu;
    }
    // TODO: Navigate to respective pages when created
  }

  selectSubmenu(submenu: string): void {
    this.activeMenu = submenu;
    // TODO: Navigate to respective pages when created
  }

  async logout(): Promise<void> {
    this.authService.logout();
    const toast = await this.toastController.create({
      message: 'Logged out successfully',
      duration: 2000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
    // Navigate to login page and replace history to prevent back navigation
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}

