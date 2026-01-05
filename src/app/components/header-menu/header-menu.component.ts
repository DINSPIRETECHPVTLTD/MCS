import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { IonicModule } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { UserContextService } from '../../services/user-context.service';
import { OrganizationService, Organization } from '../../services/organization.service';
import { BranchService, Branch } from '../../services/branch.service';

@Component({
  selector: 'app-header-menu',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './header-menu.component.html',
  styleUrls: ['./header-menu.component.scss']
})
export class HeaderMenuComponent implements OnInit {
  @Input() activeMenu: string = 'Dashboard';
  @Output() menuChange = new EventEmitter<string>();
  @Output() branchChange = new EventEmitter<Branch>();

  organization: Organization | null = null;
  userEmail: string = '';
  showUsersSubmenu: boolean = false;
  showBranchesSubmenu: boolean = false;
  branches: Branch[] = [];
  selectedBranch: Branch | null = null;
  showBranchDropdown: boolean = false;
  
  // User role and level
  userRole: string = '';
  userLevel: string = '';
  isOrgOwner: boolean = false;
  isBranchUser: boolean = false;

  constructor(
    private authService: AuthService,
    private userContext: UserContextService,
    private organizationService: OrganizationService,
    private branchService: BranchService,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) { }

  ngOnInit(): void {
    this.initializeHeader();
    
    // Show Users submenu if active menu is related to Users
    if (this.activeMenu === 'Users' || this.activeMenu === 'All Users' || this.activeMenu === 'Approvals') {
      this.showUsersSubmenu = true;
    }
    
    // Show Branches submenu if active menu is related to Branches
    if (this.activeMenu === 'Branches' || this.activeMenu === 'All Branches' || 
        this.activeMenu === 'Centers' || this.activeMenu === 'POCs' || 
        this.activeMenu === 'Staff' || this.activeMenu === 'Members') {
      this.showBranchesSubmenu = true;
    }
  }

  initializeHeader(): void {
    // Get user info from UserContext service
    this.userEmail = this.userContext.email;
    this.userRole = this.userContext.role;
    this.userLevel = this.userContext.level;
    
    // Use helper methods from UserContext service
    this.isOrgOwner = this.userContext.isOrgOwner();
    this.isBranchUser = this.userContext.isBranchUser();

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

    // Load branches
    this.loadBranches();
  }

  async loadOrganizationDetails(): Promise<void> {
    const loading = await this.loadingController.create({
      message: 'Loading organization details...',
      spinner: 'crescent'
    });
    await loading.present();
    const organizationId = this.userContext.organizationId;
    // Try primary endpoint first
    this.organizationService.getOrganization(organizationId || 0).subscribe({
      next: (org: Organization) => {
        loading.dismiss();
        this.organization = org;
        localStorage.setItem('organization_info', JSON.stringify(org));
      },
      error: (error: any) => {
        console.error('Error loading organization:', error);
      }
    });
  }

  async loadBranches(): Promise<void> {
    this.branchService.getBranches().subscribe({
      next: (branches) => {
        this.branches = branches;
        
        // For branch level users, set their branch from user context
        if (this.isBranchUser) {
          const userBranchId = this.userContext.branchId;
          if (userBranchId) {
            const userBranch = branches.find(b => b.id === userBranchId || b.id.toString() === userBranchId.toString());
            if (userBranch) {
              this.selectedBranch = userBranch;
            } else if (branches.length > 0) {
              this.selectedBranch = branches[0];
            }
          } else if (branches.length > 0) {
            this.selectedBranch = branches[0];
          }
        } else {
          // For org level users
          if (branches.length === 1) {
            this.selectedBranch = branches[0];
          } else if (branches.length > 1) {
            // Set first branch as default or get from localStorage
            const savedBranchId = localStorage.getItem('selected_branch_id');
            if (savedBranchId) {
              const savedBranch = branches.find(b => b.id.toString() === savedBranchId);
              this.selectedBranch = savedBranch || branches[0];
            } else {
              this.selectedBranch = branches[0];
            }
          }
        }
      },
      error: (error) => {
        // Try alternative endpoint
        this.branchService.getBranchesList().subscribe({
          next: (branches) => {
            this.branches = branches;
            if (branches.length === 1) {
              this.selectedBranch = branches[0];
            } else if (branches.length > 1) {
              const savedBranchId = localStorage.getItem('selected_branch_id');
              if (savedBranchId) {
                const savedBranch = branches.find(b => b.id.toString() === savedBranchId);
                this.selectedBranch = savedBranch || branches[0];
              } else {
                this.selectedBranch = branches[0];
              }
            }
          },
          error: (err) => {
            console.error('Error loading branches:', err);
            this.branches = [];
          }
        });
      }
    });
  }

  toggleBranchDropdown(): void {
    this.showBranchDropdown = !this.showBranchDropdown;
  }

  selectBranch(branch: Branch): void {
    this.selectedBranch = branch;
    this.showBranchDropdown = false;
    localStorage.setItem('selected_branch_id', branch.id.toString());
    this.branchChange.emit(branch);
  }

  setActiveMenu(menu: string): void {
    if (menu === 'Users' && this.isOrgOwner) {
      this.showUsersSubmenu = !this.showUsersSubmenu;
      this.showBranchesSubmenu = false;
    } else if (menu === 'Branches') {
      if (this.isOrgOwner) {
        // For Org Owner, show All Branches page
        this.showUsersSubmenu = false;
        this.showBranchesSubmenu = false;
        this.activeMenu = 'All Branches';
        this.menuChange.emit('All Branches');
        setTimeout(() => {
          this.navigateToRoute('/branches');
        }, 0);
      } else if (this.isBranchUser && !this.showBranchesSubmenu) {
        this.activeMenu = 'Dashboard';
        this.showBranchesSubmenu = true;
        this.menuChange.emit('Dashboard');
        // Use setTimeout to ensure navigation happens after DOM updates
        setTimeout(() => {
          this.navigateToRoute('/branch-dashboard');
        }, 0);
      } else {
        this.showBranchesSubmenu = !this.showBranchesSubmenu;
      }
      this.showUsersSubmenu = false;
    } else if (menu === 'Info') {
      this.showUsersSubmenu = false;
      this.showBranchesSubmenu = false;
      this.activeMenu = menu;
      this.menuChange.emit(menu);
      setTimeout(() => {
        this.navigateToRoute('/organization-info');
      }, 0);
    } else if (menu === 'Dashboard') {
      this.showUsersSubmenu = false;
      this.showBranchesSubmenu = false;
      this.activeMenu = menu;
      this.menuChange.emit(menu);
      setTimeout(() => {
        this.navigateToRoute('/home');
      }, 0);
    } else {
      this.showUsersSubmenu = false;
      this.showBranchesSubmenu = false;
      this.activeMenu = menu;
      this.menuChange.emit(menu);
    }
  }

  private navigateToRoute(route: string): void {
    // Blur any focused element to prevent aria-hidden accessibility issues
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    
    // Use NgZone to ensure navigation happens within Angular's zone
    this.ngZone.run(() => {
      this.router.navigateByUrl(route, { 
        skipLocationChange: false,
        replaceUrl: true  // Replace the current page instead of stacking
      }).then((success) => {
        if (success) {
          console.log('Navigated to:', route);
          // Force change detection after navigation
          this.ngZone.run(() => {
            setTimeout(() => {
              this.cdr.detectChanges();
            }, 100);
          });
        } else {
          console.error('Navigation failed for:', route);
          // Fallback: try using window.location for hard navigation
          window.location.href = route;
        }
      }).catch(err => {
        console.error('Navigation error:', err);
        // Fallback: try using window.location for hard navigation
        window.location.href = route;
      });
    });
  }

  selectSubmenu(submenu: string): void {
    this.activeMenu = submenu;
    this.showUsersSubmenu = false;
    this.showBranchesSubmenu = false;
    this.menuChange.emit(submenu);
    
    // Navigate to respective pages with proper error handling
    let route: string | null = null;
    
    if (submenu === 'All Users') {
      route = '/users';
    } else if (submenu === 'Approvals') {
      route = '/approvals';
    } else if (submenu === 'All Branches') {
      route = '/branches';
    } else if (submenu === 'Dashboard') {
      // Dashboard from Branches submenu goes to branch dashboard
      route = '/branch-dashboard';
    } else if (submenu === 'Centers') {
      route = '/centers';
    } else if (submenu === 'POCs') {
      route = '/pocs';
    } else if (submenu === 'Staff') {
      route = '/staff';
    } else if (submenu === 'Members') {
      route = '/members';
    }
    
    if (route) {
      // Use setTimeout to ensure navigation happens after DOM updates
      setTimeout(() => {
        this.navigateToRoute(route!);
      }, 0);
    }
  }

  async logout(): Promise<void> {
    try {
      // Clear auth data first
      this.authService.logout();
      
      // Navigate immediately without waiting
      this.router.navigate(['/login'], { replaceUrl: true }).then(() => {
        // Show toast after navigation completes
        this.toastController.create({
          message: 'Logged out successfully',
          duration: 2000,
          color: 'success',
          position: 'top'
        }).then(toast => toast.present());
      }).catch(() => {
        // Fallback: use window location if router fails
        window.location.href = '/login';
      });
    } catch (error) {
      console.error('Error during logout:', error);
      // Force navigation using window location as fallback
      window.location.href = '/login';
    }
  }
}
