import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { UserContextService } from '../../services/user-context.service';
import { OrganizationService } from '../../services/organization.service';
import { BranchService } from '../../services/branch.service';
import { Organization } from '../../models/organization.models';
import { Branch } from '../../models/branch.models';

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
    private userContext: UserContextService,
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
    // Get organization ID from UserContext service
    const organizationId = this.userContext.organizationId;
    
    if (!organizationId) {
      console.error('Organization ID not found in user context');
      // Set default values if organization ID is not available
      this.organization = {
        name: 'Navya Micro Credit Services',
        phone: '+91 9898123123',
        city: 'Hyderabad'
      } as Organization;
      return;
    }

    // Use the organization service to get organization details
    this.organizationService.getOrganization(organizationId).subscribe({
      next: (org: Organization) => {
        this.organization = org;
        localStorage.setItem('organization_info', JSON.stringify(org));
      },
      error: (error: any) => {
        console.error('Error loading organization:', error);
        // Set default values if API fails
        this.organization = {
          name: 'Navya Micro Credit Services',
          phone: '+91 9898123123',
          city: 'Hyderabad'
        } as Organization;
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

