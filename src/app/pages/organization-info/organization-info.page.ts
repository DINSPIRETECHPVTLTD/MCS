import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { OrganizationService, Organization } from '../../services/organization.service';
import { BranchService, Branch } from '../../services/branch.service';

@Component({
  selector: 'app-organization-info',
  templateUrl: './organization-info.page.html',
  styleUrls: ['./organization-info.page.scss']
})
export class OrganizationInfoPage implements OnInit, ViewWillEnter {
  organization: Organization | null = null;
  activeMenu: string = 'Info';

  constructor(
    private authService: AuthService,
    private organizationService: OrganizationService,
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
    if (this.authService.isAuthenticated()) {
      this.loadOrganizationDetails();
    }
  }

  async loadOrganizationDetails(): Promise<void> {
    // Try primary endpoint first
    this.organizationService.getOrganizationDetails().subscribe({
      next: (org) => {
        this.organization = org;
        localStorage.setItem('organization_info', JSON.stringify(org));
      },
      error: (error) => {
        // Try alternative endpoint
        this.organizationService.getOrganizationInfo().subscribe({
          next: (org) => {
            this.organization = org;
            localStorage.setItem('organization_info', JSON.stringify(org));
          },
          error: (err) => {
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

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

  onBranchChange(branch: Branch): void {
    console.log('Branch changed to:', branch);
  }
}

