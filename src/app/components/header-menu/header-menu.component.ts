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
  showMasterSubmenu: boolean = false;
  branches: Branch[] = [];
  selectedBranch: Branch | null = null;
  
  // User role and level
  userRole: string = '';
  userLevel: string = '';
  isOrgOwner: boolean = false;
  isBranchUser: boolean = false;
  isStaff: boolean = false;

  // Org Mode vs Branch Mode: owner default = Org Mode; owner after "Navigate to Branch" = Branch Mode; branch admin/staff = Branch Mode
  isOrgMode: boolean = false;
  isBranchMode: boolean = false;
  showBranchDropdown: boolean = false;

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
    
    // Show Loan submenu if active menu is related to Loan (Branch User only)
    if (this.activeMenu === 'Loan' || this.activeMenu === 'Add Loan' || 
        this.activeMenu === 'Manage Loan' || this.activeMenu === 'Preclose Loan') {
      this.showLoanSubmenu = true;
    }
    // Show Master submenu if active menu is Master Data or Payment Terms (Org Mode)
    if (this.activeMenu === 'Master Data' || this.activeMenu === 'Payment Terms') {
      this.showMasterSubmenu = true;
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

    // Org Mode: owner and no branch selected. Branch Mode: branch user, or owner who navigated to a branch
    const ownerViewingBranch = this.isOrgOwner && this.userContext.branchId != null;
    this.isOrgMode = this.isOrgOwner && !ownerViewingBranch;
    this.isBranchMode = this.isBranchUser || ownerViewingBranch;

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

    // Load branches (for branch users: show branch label; owner has no dropdown)
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
      error: (error: string) => {
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
      this.updateModeFlags();
      return;
    }
    
    // Fallback: Fetch branches from API if not available from login
    this.branchService.getBranches().subscribe({
      next: (branches) => {
        this.branches = branches;
        this.setSelectedBranch(branches);
        this.updateModeFlags();
      },
      error: (_error) => {
        // Try alternative endpoint
        this.branchService.getBranchesList().subscribe({
          next: (branches) => {
            this.branches = branches;
            this.setSelectedBranch(branches);
            this.updateModeFlags();
          },
          error: (err) => {
            console.error('Error loading branches:', err);
            this.branches = [];
          }
        });
      }
    });
  }

  private updateModeFlags(): void {
    const ownerViewingBranch = this.isOrgOwner && this.userContext.branchId != null;
    this.isOrgMode = this.isOrgOwner && !ownerViewingBranch;
    this.isBranchMode = this.isBranchUser || ownerViewingBranch;
    this.cdr.markForCheck();
  }

  private setSelectedBranch(branches: Branch[]): void {
    const userBranchId = this.userContext.branchId;
    if (this.isBranchUser) {
      if (userBranchId) {
        const userBranch = branches.find(b => b.id === userBranchId || b.id?.toString() === userBranchId?.toString());
        if (userBranch) {
          this.selectedBranch = userBranch;
        } else if (branches.length > 0) {
          this.selectedBranch = branches[0];
        }
      } else if (branches.length > 0) {
        this.selectedBranch = branches[0];
      }
    } else if (this.isOrgOwner && userBranchId != null) {
      // Owner in Branch Mode: set selectedBranch so header can show branch name
      const branch = branches.find(b => b.id === userBranchId || b.id?.toString() === userBranchId?.toString());
      this.selectedBranch = branch || null;
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
      this.showUsersSubmenu = false;
      this.showBranchesSubmenu = false;
      this.showLoanSubmenu = false;
      this.activeMenu = 'Users';
      this.menuChange.emit('Users');
      setTimeout(() => this.navigateToRoute('/users'), 0);
    } else if (menu === 'Branches' && this.isOrgOwner) {
      this.showUsersSubmenu = false;
      this.showBranchesSubmenu = false;
      this.showLoanSubmenu = false;
      this.activeMenu = 'Branches';
      this.menuChange.emit('Branches');
      setTimeout(() => this.navigateToRoute('/branches'), 0);
    } else if (menu === 'Master' && this.isOrgOwner) {
      this.showUsersSubmenu = false;
      this.showBranchesSubmenu = false;
      this.showLoanSubmenu = false;
      this.showMasterSubmenu = !this.showMasterSubmenu;
      this.activeMenu = 'Master';
      this.menuChange.emit('Master');
    } else if (menu === 'Investments' && this.isOrgOwner) {
      this.showUsersSubmenu = false;
      this.showBranchesSubmenu = false;
      this.showLoanSubmenu = false;
      this.activeMenu = 'Investments';
      this.menuChange.emit('Investments');
      setTimeout(() => this.navigateToRoute('/investments'), 0);
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
      // Branch Mode -> branch dashboard with branch id; Org Mode (owner) -> home
      setTimeout(() => {
        if (this.isBranchMode) {
          const branchId = this.selectedBranch?.id ?? this.userContext.branchId;
          if (branchId != null) {
            this.navigateToRoute(`/branch-dashboard/${branchId}`);
          } else {
            this.navigateToRoute('/home');
          }
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
      // Navigate directly for Branch Mode users (branch admin/staff, or owner viewing a branch)
      if (this.isBranchMode) {
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
    // Keep Master submenu open when selecting its items (Org Mode)
    if (submenu === 'Master Data' || submenu === 'Payment Terms') {
      this.showMasterSubmenu = true;
    } else {
      this.showMasterSubmenu = false;
    }
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
      // Dashboard from Branches submenu goes to branch dashboard with branch id
      const branchId = this.selectedBranch?.id ?? this.userContext.branchId;
      route = branchId != null ? `/branch-dashboard/${branchId}` : '/home';
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
    } else if (submenu === 'Master Data') {
      route = '/master-data';
    } else if (submenu === 'Payment Terms') {
      route = '/payment-terms';
    }
    
    if (route) {
      // Use setTimeout to ensure navigation happens after DOM updates
      setTimeout(() => {
        this.navigateToRoute(route!);
      }, 0);
    }
  }

  /** Switch back to Organization Mode (owner only, when currently in Branch Mode) */
  returnToOrgMode(): void {
    this.userContext.setBranchId(null);
    try {
      localStorage.removeItem('selected_branch_id');
    } catch (_) {}
    this.selectedBranch = null;
    this.isOrgMode = true;
    this.isBranchMode = false;
    this.navigateToRoute('/home');
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
