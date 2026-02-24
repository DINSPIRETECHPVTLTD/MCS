import { Component, OnInit, NgZone, ApplicationRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController, ViewWillEnter, ModalController, AlertController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { UserContextService } from '../../services/user-context.service';
import { BranchService } from '../../services/branch.service';
import { Branch } from '../../models/branch.models';
import { AddBranchModalComponent } from './add-branch-modal.component';
import { ColDef, ValueGetterParams, ICellRendererParams, GridOptions } from 'ag-grid-community';
import { agGridTheme } from '../../ag-grid-theme';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-branches',
  templateUrl: './branches.page.html'
})
export class BranchesComponent implements ViewWillEnter {
  //fbranches: Branch[] = [];
  branchForm: FormGroup;
  showAddForm: boolean = false;
  isEditing: boolean = false;
  editingBranchId: number | null = null;
  activeMenu: string = 'All Branches';
  isLoading: boolean = false;
  selectedBranch: Branch | null = null;
  private subscriptions = new Subscription();

  // AG Grid configuration
  rowData: Branch[] = [];
  pagination: boolean = true;
  paginationPageSize: number = 20;
  paginationPageSizeSelector: number[] = [10, 20, 50, 100];
  columnDefs: ColDef[] = [
    { field: 'id', headerName: 'ID', width: 80, sortable: true, filter: true },
    { field: 'name', headerName: 'Name', sortable: true, filter: true, flex: 1 },
    { 
      headerName: 'Address', 
      valueGetter: (params: ValueGetterParams<Branch>) => {
        const a1 = params.data?.address1 || '';
        const a2 = params.data?.address2 || '';
        const city = params.data?.city || '';
        const state = params.data?.state || '';
        const zip = params.data?.zipCode || '';
        const parts = [a1, a2, city, state && zip ? `${state}-${zip}` : state || zip].filter(Boolean);
        return parts.join(', ');
      }, 
      sortable: true, 
      filter: true, 
      flex: 2 
    },
    { field: 'phoneNumber', headerName: 'Phone No', sortable: true, filter: true, width: 140 },
    {
      headerName: 'Actions',
      field: 'actions',
      width: 260,
      cellRenderer: (params: ICellRendererParams<Branch>) => {
        const container = document.createElement('div');
        container.className = 'actions-cell';
        container.innerHTML = `
          <button class="ag-btn ag-edit">Edit</button>
          <button class="ag-btn ag-delete">Inactive</button>
          <button class="ag-btn ag-navigate">Navigate</button>
        `;
        const editBtn = container.querySelector('.ag-edit');
        const delBtn = container.querySelector('.ag-delete');
        const navBtn = container.querySelector('.ag-navigate');
        if (editBtn) editBtn.addEventListener('click', () => params.context.componentParent.editBranch(params.data));
        if (delBtn) delBtn.addEventListener('click', () => params.context.componentParent.inactivateBranch(params.data));
        if (navBtn) navBtn.addEventListener('click', () => params.context.componentParent.navigateToBranch(params.data));
        return container;
      }
    }
  ];
  defaultColDef: ColDef = { 
    resizable: true, 
    sortable: true, 
    filter: true 
  };

  constructor(
    private formBuilder: FormBuilder,
    private branchService: BranchService,
    private authService: AuthService,
    private userContext: UserContextService,
    private router: Router,
    private ngZone: NgZone,
    private appRef: ApplicationRef,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private modalController: ModalController,
    private alertController: AlertController
  ) {
    this.branchForm = this.formBuilder.group({
      name: [''],
      code: [''],
      address: [''],
      city: [''],
      state: [''],
      phone: [''],
      email: ['']
    });

    // Grid options with context so cell renderers can call component methods
    this.gridOptions = {
      theme: agGridTheme,
      context: { componentParent: this }
    };
  }

  gridOptions: GridOptions;

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    // ✅ Load initial data
    this.branchService.loadBranches();

    // ✅ Subscribe once - auto-updates on every change!
    this.subscriptions.add(
      this.branchService.branches$.subscribe(branches => {
        this.rowData = branches;
      })
    );
  }

  ionViewWillEnter(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
  }



  async toggleAddForm(): Promise<void> {
    if (this.showAddForm) {
      // Close modal if already open
      const modal = await this.modalController.getTop();
      if (modal) {
        await this.modalController.dismiss();
      }
      this.showAddForm = false;
      this.resetForm();
    } else {
      // Open modal
      this.showAddForm = true;
      await this.openAddBranchModal();
    }
  }

  async openAddBranchModal(): Promise<void> {
    const modal = await this.modalController.create({
      component: AddBranchModalComponent,
      componentProps: {
        isEditing: this.isEditing,
        editingBranchId: this.editingBranchId
      },
      cssClass: 'add-branch-modal'
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    this.showAddForm = false;
    this.resetForm();
  }

  editBranch(branch: Branch): void {
    this.isEditing = true;
    this.editingBranchId = branch.id;
    this.openAddBranchModal();
  }

  async inactivateBranch(branch: Branch): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Mark as Inactive',
      message: `Are you sure you want to mark branch "${branch.name}" as inactive?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Mark Inactive',
          handler: async () => {
            const loading = await this.loadingController.create({ message: 'Marking as inactive...', spinner: 'crescent' });
            await loading.present();
            this.branchService.inactivateBranch(branch.id).subscribe({
              next: async () => {
                await loading.dismiss();
                this.showToast('Branch marked as inactive', 'success');
                },
              error: async (err) => {
                await loading.dismiss();
                console.error('Inactive error', err);
                this.showToast('Failed to mark branch as inactive', 'danger');
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  resetForm(): void {
    this.branchForm.reset();
    this.isEditing = false;
    this.editingBranchId = null;
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

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

  onBranchChange(branch: Branch): void {
    this.selectedBranch = branch;
  }

  /** Navigate to branch dashboard for the selected branch (owner only) */
  navigateToBranch(branch: Branch): void {
    // Blur the button so focus is not inside an aria-hidden ancestor when Ionic hides the page
    const active = document.activeElement as HTMLElement | null;
    if (active && typeof active.blur === 'function') {
      active.blur();
    }
    this.userContext.setBranchId(branch.id);
    localStorage.setItem('selected_branch_id', branch.id.toString());
    // Navigate to branch dashboard with branch id in URL so the route is distinct and the page refreshes
    this.ngZone.run(() => {
      this.router.navigate(['/branch-dashboard', branch.id], { replaceUrl: true }).then((success) => {
        if (success) {
          this.ngZone.run(() => this.appRef.tick());
        }
      });
    });
  }
}

