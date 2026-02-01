import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { IonicModule } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { UserContextService } from '../../services/user-context.service';
import { OrganizationService } from '../../services/organization.service';
import { BranchService } from '../../services/branch.service';
import { Organization } from '../../models/organization.models';
import { Branch } from '../../models/branch.models';

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
  userDisplayName: string = '';
  showUsersSubmenu: boolean = false;
  showBranchesSubmenu: boolean = false;
  showLoanSubmenu: boolean = false;
  branches: Branch[] = [];
  selectedBranch: Branch | null = null;
  showBranchDropdown: boolean = false;
  
  // User role and level
  userRole: string = '';
  userLevel: string = '';
  isOrgOwner: boolean = false;
  isBranchUser: boolean = false;
  isStaff: boolean = false;

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
        this.activeMenu === 'Staff' || this.activeMenu === 'Members' ||
        this.activeMenu === 'Loan' || this.activeMenu === 'Add Loan' || 
        this.activeMenu === 'Manage Loan' || this.activeMenu === 'Preclose Loan' ||
        this.activeMenu === 'Recovery Posting') {
      this.showBranchesSubmenu = true;
    }
    
    // Show Loan submenu if active menu is related to Loan
    if (this.activeMenu === 'Loan' || this.activeMenu === 'Add Loan' || 
        this.activeMenu === 'Manage Loan' || this.activeMenu === 'Preclose Loan') {
      this.showLoanSubmenu = true;
    }
  }

  initializeHeader(): void {
    // Get user info from UserContext service
    const firstName = this.userContext.firstName || '';
    const lastName = this.userContext.lastName || '';
    this.userDisplayName = `${firstName} ${lastName}`.trim() || this.userContext.email || 'User';
    this.userRole = this.userContext.role;
    this.userLevel = this.userContext.level;
    
    // Use helper methods from UserContext service
    this.isOrgOwner = this.userContext.isOrgOwner();
    this.isBranchUser = this.userContext.isBranchUser();
    this.isStaff = this.userRole?.toLowerCase() === 'staff';
    console.log('User Context:', this.userContext);
    console.log('User Role:', this.userRole);
    console.log('User Level:', this.userLevel);
    console.log('Is Org Owner:', this.isOrgOwner);
    console.log('Is Branch User:', this.isBranchUser);
    console.log('Is Staff:', this.isStaff);

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
    // First, try to get branches from login response
    const branchesFromLogin = this.authService.getBranchesFromLogin();
    
    if (branchesFromLogin && branchesFromLogin.length > 0) {
      // Use branches from login response
      this.branches = branchesFromLogin;
      this.setSelectedBranch(branchesFromLogin);
      console.log('Loaded branches from login response:', branchesFromLogin.length);
      return;
    }
    
    // Fallback: Fetch branches from API if not available from login
    console.log('Branches not available from login, fetching from API...');
    this.branchService.getBranches().subscribe({
      next: (branches) => {
        this.branches = branches;
        this.setSelectedBranch(branches);
      },
      error: (error) => {
        // Try alternative endpoint
        this.branchService.getBranchesList().subscribe({
          next: (branches) => {
            this.branches = branches;
            this.setSelectedBranch(branches);
          },
          error: (err) => {
            console.error('Error loading branches:', err);
            this.branches = [];
          }
        });
      }
    });
  }

  private setSelectedBranch(branches: Branch[]): void {
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
    // Persist and notify listeners about the selected branch on initial load
    if (this.selectedBranch) {
      try {
        localStorage.setItem('selected_branch_id', this.selectedBranch.id.toString());
      } catch (e) {
        // ignore storage errors
      }
      this.branchChange.emit(this.selectedBranch);
      console.log('Selected Branch set to header:', this.selectedBranch);
    }
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
      this.showLoanSubmenu = false;
    } else if (menu === 'Branches') {
      if (this.isOrgOwner) {
        // For Org Owner, toggle submenu
        this.showUsersSubmenu = false;
        this.showBranchesSubmenu = !this.showBranchesSubmenu;
        this.showLoanSubmenu = false;
      }
    } else if (menu === 'Loan') {
      // Toggle Loan submenu
      this.showUsersSubmenu = false;
      this.showLoanSubmenu = !this.showLoanSubmenu;
      if (this.isOrgOwner) {
        // Keep Branches submenu open for Org Owner
        this.showBranchesSubmenu = true;
      } else if (this.isBranchUser) {
        // For Branch Users, just toggle the submenu, don't navigate
        this.activeMenu = 'Loan';
        this.menuChange.emit('Loan');
      }
    } else if (menu === 'Info') {
      this.showUsersSubmenu = false;
      this.showBranchesSubmenu = false;
      this.activeMenu = menu;
      this.menuChange.emit(menu);
      setTimeout(() => {
        this.navigateToRoute('/organization-info');
      }, 0);
    } else if (menu === 'Dashboard' || menu === 'My View') {
      this.showUsersSubmenu = false;
      this.showBranchesSubmenu = false;
      this.showLoanSubmenu = false;
      this.activeMenu = menu;
      this.menuChange.emit(menu);
      // For branch users, navigate to branch dashboard; for org owners, navigate to home
      setTimeout(() => {
        if (this.isBranchUser) {
          this.navigateToRoute('/branch-dashboard');
        } else {
          this.navigateToRoute('/home');
        }
      }, 0);
    } else if (menu === 'Recovery Posting') {
      this.showUsersSubmenu = false;
      this.showBranchesSubmenu = false;
      this.showLoanSubmenu = false;
      this.activeMenu = menu;
      this.menuChange.emit(menu);
      setTimeout(() => {
        this.selectSubmenu(menu);
      }, 0);
    } else {
      // Handle other menu items (Centers, POCs, Staff, Members)
      this.showUsersSubmenu = false;
      this.showBranchesSubmenu = false;
      this.showLoanSubmenu = false;
      this.activeMenu = menu;
      this.menuChange.emit(menu);
      // Navigate directly for branch users
      if (this.isBranchUser) {
        setTimeout(() => {
          this.selectSubmenu(menu);
        }, 0);
      }
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

  toggleLoanSubmenu(): void {
    this.showLoanSubmenu = !this.showLoanSubmenu;
  }

  selectSubmenu(submenu: string): void {
    this.activeMenu = submenu;
    this.showUsersSubmenu = false;
    this.showLoanSubmenu = false;
    // Keep Branches submenu open for Org Owner when selecting Loan submenu items
    if (this.isOrgOwner && (submenu === 'Add Loan' || submenu === 'Manage Loan' || submenu === 'Preclose Loan')) {
      this.showBranchesSubmenu = true;
    } else {
      this.showBranchesSubmenu = false;
    }
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
    } else if (submenu === 'Add Loan') {
      route = '/add-loan';
    } else if (submenu === 'Manage Loan') {
      route = '/manage-loan';
    } else if (submenu === 'Preclose Loan') {
      route = '/preclose-loan';
    } else if (submenu === 'Recovery Posting') {
      route = '/recovery-posting';
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
