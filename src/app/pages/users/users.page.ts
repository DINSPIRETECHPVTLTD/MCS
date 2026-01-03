import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { UserService, User, CreateUserRequest } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { OrganizationService, Organization } from '../../services/organization.service';
import { BranchService, Branch } from '../../services/branch.service';

@Component({
  selector: 'app-users',
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
})
export class UsersPage implements OnInit {
  users: User[] = [];
  userForm: FormGroup;
  showAddForm: boolean = false;
  isEditing: boolean = false;
  editingUserId: number | null = null;
  
  // Header and navigation properties
  organization: Organization | null = null;
  userEmail: string = '';
  activeMenu: string = 'All Users';
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
    private formBuilder: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private organizationService: OrganizationService,
    private branchService: BranchService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.userForm = this.formBuilder.group({
      firstName: ['', [Validators.required]],
      middleName: [''],
      lastName: ['', [Validators.required]],
      phoneNumber: ['', [Validators.pattern(/^[0-9]{10}$/)]],
      address1: [''],
      address2: [''],
      city: [''],
      state: [''],
      pinCode: ['', [Validators.pattern(/^[0-9]{6}$/)]],
      email: ['', [Validators.email]],
      level: ['Org'],
      role: ['Owner'],
      organizationId: [0]
    });
  }

  ngOnInit(): void {
    console.log('UsersPage ngOnInit called');
    // Check authentication
    if (!this.authService.isAuthenticated()) {
      console.log('Not authenticated, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    // Initialize header and navigation
    this.initializeHeader();
    
    console.log('Loading users and setting organization ID');
    this.loadUsers();
    this.setOrganizationId();
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
    
    // Show Users submenu since we're on the Users page
    this.showUsersSubmenu = true;
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
  }

  setActiveMenu(menu: string): void {
    if (menu === 'Users' && this.isOrgOwner) {
      this.showUsersSubmenu = !this.showUsersSubmenu;
      this.showBranchesSubmenu = false;
    } else if (menu === 'Branches') {
      if (this.isBranchUser && !this.showBranchesSubmenu) {
        this.activeMenu = 'Dashboard';
        this.showBranchesSubmenu = true;
      } else {
        this.showBranchesSubmenu = !this.showBranchesSubmenu;
      }
      this.showUsersSubmenu = false;
    } else {
      this.showUsersSubmenu = false;
      this.showBranchesSubmenu = false;
      this.activeMenu = menu;
    }
  }

  selectSubmenu(submenu: string): void {
    this.activeMenu = submenu;
    this.showUsersSubmenu = false;
    this.showBranchesSubmenu = false;
    
    // Navigate to respective pages
    if (submenu === 'All Users') {
      this.router.navigate(['/users']);
    } else if (submenu === 'Dashboard') {
      this.router.navigate(['/home']);
    }
    // TODO: Add navigation for other submenu items when pages are created
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
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  setOrganizationId(): void {
    const userInfo = this.authService.getUserInfo();
    if (userInfo?.organizationId) {
      this.userForm.patchValue({
        organizationId: userInfo.organizationId
      });
    }
  }

  async loadUsers(): Promise<void> {
    const loading = await this.loadingController.create({
      message: 'Loading users...',
      spinner: 'crescent'
    });
    await loading.present();

    this.userService.getUsers().subscribe({
      next: (users) => {
        loading.dismiss();
        this.users = users || [];
        console.log('Users loaded:', this.users.length);
      },
      error: (error) => {
        loading.dismiss();
        this.users = []; // Ensure users array is initialized even on error
        console.error('Error loading users:', error);
        // Only show toast for actual errors, not 404s which might be expected
        if (error.status !== 404) {
          this.showToast('Error loading users: ' + (error.error?.message || error.message || 'Unknown error'), 'danger');
        } else {
          console.log('No users endpoint found or no users exist yet');
        }
      }
    });
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.resetForm();
    }
  }

  resetForm(): void {
    this.userForm.reset({
      level: 'Org',
      role: 'Owner',
      organizationId: this.userForm.value.organizationId || 0
    });
    this.isEditing = false;
    this.editingUserId = null;
  }

  async onSubmit(): Promise<void> {
    if (this.userForm.invalid) {
      this.showToast('Please fill in all required fields', 'danger');
      return;
    }

    const loading = await this.loadingController.create({
      message: this.isEditing ? 'Updating user...' : 'Creating user...',
      spinner: 'crescent'
    });
    await loading.present();

    const userData: CreateUserRequest = {
      firstName: this.userForm.value.firstName,
      middleName: this.userForm.value.middleName || '',
      lastName: this.userForm.value.lastName,
      phoneNumber: this.userForm.value.phoneNumber || '',
      address1: this.userForm.value.address1 || '',
      address2: this.userForm.value.address2 || '',
      city: this.userForm.value.city || '',
      state: this.userForm.value.state || '',
      pinCode: this.userForm.value.pinCode || '',
      email: this.userForm.value.email || '',
      level: this.userForm.value.level,
      role: this.userForm.value.role,
      organizationId: this.userForm.value.organizationId,
      branchId: null
    };

    this.userService.createUser(userData).subscribe({
      next: async (user) => {
        await loading.dismiss();
        this.showToast(this.isEditing ? 'User updated successfully!' : 'User created successfully!', 'success');
        this.resetForm();
        this.showAddForm = false;
        this.loadUsers();
      },
      error: async (error) => {
        await loading.dismiss();
        const errorMessage = error.error?.message || error.message || 'Failed to create user. Please try again.';
        this.showToast(errorMessage, 'danger');
        console.error('Error creating user:', error);
      }
    });
  }

  async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}

