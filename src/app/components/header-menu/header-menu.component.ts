import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { IonicModule } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
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
    private organizationService: OrganizationService,
    private branchService: BranchService,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) { }

  ngOnInit(): void {
    this.initializeHeader();
    
    // Show Users submenu if active menu is related to Users
    if (this.activeMenu === 'Users' || this.activeMenu === 'All Users' || this.activeMenu === 'Approvals') {
      this.showUsersSubmenu = true;
    }
    
    // Show Branches submenu if active menu is related to Branches
    if (this.activeMenu === 'Branches' || this.activeMenu === 'Add new branch' || 
        this.activeMenu === 'Centers' || this.activeMenu === 'POCs' || 
        this.activeMenu === 'Staff' || this.activeMenu === 'Members') {
      this.showBranchesSubmenu = true;
    }
  }

  initializeHeader(): void {
    // Get user info
    const userInfo = this.authService.getUserInfo();
    this.userEmail = userInfo?.email || '';
    this.userRole = userInfo?.role || '';
    this.userLevel = userInfo?.userType || '';
    
    // Determine user type based on UserType and Role
    const userTypeLower = this.userLevel?.toLowerCase() || '';
    const roleLower = this.userRole?.toLowerCase() || '';
    
    this.isOrgOwner = (userTypeLower === 'org' || userTypeLower === 'organization') && roleLower === 'owner';
    this.isBranchUser = (userTypeLower === 'branch') && 
                       (roleLower === 'branch user' || 
                        roleLower === 'staff' ||
                        roleLower === 'branchuser');

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

  async loadBranches(): Promise<void> {
    this.branchService.getBranches().subscribe({
      next: (branches) => {
        this.branches = branches;
        
        // For branch level users, set their branch from user info
        if (this.isBranchUser) {
          const userInfo = this.authService.getUserInfo();
          const userBranchId = userInfo?.branchId;
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
      if (this.isBranchUser && !this.showBranchesSubmenu) {
        this.activeMenu = 'Dashboard';
        this.showBranchesSubmenu = true;
        this.menuChange.emit('Dashboard');
      } else {
        this.showBranchesSubmenu = !this.showBranchesSubmenu;
      }
      this.showUsersSubmenu = false;
    } else {
      this.showUsersSubmenu = false;
      this.showBranchesSubmenu = false;
      this.activeMenu = menu;
      this.menuChange.emit(menu);
    }
  }

  selectSubmenu(submenu: string): void {
    this.activeMenu = submenu;
    this.showUsersSubmenu = false;
    this.showBranchesSubmenu = false;
    this.menuChange.emit(submenu);
    
    // Navigate to respective pages
    if (submenu === 'All Users') {
      this.router.navigate(['/users']);
    } else if (submenu === 'Dashboard') {
      this.router.navigate(['/home']);
    }
    // TODO: Add navigation for other submenu items when pages are created
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
