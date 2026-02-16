import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { ColDef, GridApi, GridReadyEvent, RowSelectionOptions } from 'ag-grid-community';
import { agGridTheme } from '../../ag-grid-theme';
import { ToastController, LoadingController } from '@ionic/angular';
import { Investments } from 'src/app/models/investments.models';
import { ModalController } from '@ionic/angular';
import { InvestmentsService } from '../../services/investments.service';
import { AddInvestmentsComponent } from './add-investments.component';
import { UserService } from '../../services/user.service';
import { forkJoin } from 'rxjs';
//import { AddInvestmentModalComponent } from './add-investment-modal.component';

@Component({
  selector: 'app-investments',
  templateUrl: './investments.page.html',
  styleUrls: ['./investments.page.scss']
})
export class InvestmentsComponent implements OnInit, ViewWillEnter {
  activeMenu: string = 'investments';

  investments: Investments[] = [];
  rowData: Investments[] = [];
  columnDefs: ColDef[] = [];
  defaultColDef: ColDef = { sortable: true, filter: true, resizable: true };
  pagination: boolean = true;
  paginationPageSize: number = 20;
  paginationPageSizeSelector: number[] = [10, 20, 50, 100];
  isLoading: boolean = false;
  
    private gridApi?: GridApi;
    gridOptions = { theme: agGridTheme, context: { componentParent: this } };

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private modalController: ModalController,
    private investmentsService: InvestmentsService,
    private userService: UserService
  ) {
    
  }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.columnDefs = [
      { headerName: 'Investment ID', field: 'id', width: 100, sortable: true, filter: true },
      { headerName: 'User Name', field: 'userName', width: 150, sortable: true, filter: true },
      { headerName: 'Amount', field: 'amount', width: 100, sortable: true, filter: true },
      { headerName: 'Investment Date', field: 'investmentDate', width: 150, sortable: true, filter: true, 
        valueFormatter: (params) => {
        if (!params.value) return '';
        return new Date(params.value).toLocaleDateString();
        }
      },
    ]; 
  }

  ionViewWillEnter(): void {
    if (this.authService.isAuthenticated()) {
      this.loadInvestments();
    }
  }

  async loadInvestments(): Promise<void> {
  this.isLoading = true;
  const loading = await this.loadingController.create({
    message: 'Loading investments...',
    spinner: 'crescent'
  });
  await loading.present();

  // Fetch both investments and all users in parallel
  forkJoin([
    this.investmentsService.getInvestments(),
    this.userService.getUsers()
  ]).subscribe({
    next: ([investments, users]) => {
      this.investments = investments || [];

      // Create user map with full name (single map, reuse for all investments)
      const userMap = new Map();
      users.forEach(user => {
        userMap.set(user.id, `${user.firstName} ${user.lastName}`);
      });

      // Map investments with userName
      this.rowData = this.investments.map(inv => ({
        ...inv,
        userName: userMap.get(inv.userId) || 'Unknown'
      }));

      // Update grid
      if (this.gridApi) {
        this.gridApi.setGridOption('rowData', this.rowData);
        setTimeout(() => {
          this.gridApi?.sizeColumnsToFit();
        }, 100);
      }

      loading.dismiss();
      this.isLoading = false;
    },
    error: (error) => {
      loading.dismiss();
      this.isLoading = false;
      this.investments = [];
      this.rowData = [];
      console.error('Error loading data:', error);
      if (error.status !== 404) {
        this.showToast('Error loading investments: ' + (error.error?.message || error.message || 'Unknown error'), 'danger');
      }
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

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    // Set rowData if it's already loaded
    if (this.rowData && this.rowData.length > 0) {
      this.gridApi.setGridOption('rowData', this.rowData);
    }
    // Auto-size columns to fit
    setTimeout(() => {
      this.gridApi?.sizeColumnsToFit();
    }, 100);
  }

  async openAddInvestmentModal(): Promise<void> {
    const modal = await this.modalController.create({
      component: AddInvestmentsComponent,
      cssClass: 'add-investment-modal'
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data && data.success) {
      // Refresh investments list after successful save
      this.loadInvestments();
    }
  }

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

}

