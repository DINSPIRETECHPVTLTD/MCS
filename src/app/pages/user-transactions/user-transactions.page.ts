import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { ColDef, GridApi, GridReadyEvent, RowSelectionOptions } from 'ag-grid-community';
import { agGridTheme } from '../../ag-grid-theme';
import { ToastController, LoadingController } from '@ionic/angular';
import { Investments } from 'src/app/models/investments.models';
import { ModalController } from '@ionic/angular';
import { UserService } from '../../services/user.service';
import { forkJoin } from 'rxjs';
import { UserTransactions } from 'src/app/models/user-transactions.models';
import { UserTransactionsService } from '../../services/user-transactions.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-user-transactions',
  templateUrl: './user-transactions.page.html',
  styleUrls: ['./user-transactions.page.scss']
})
export class UserTransactionsComponent implements OnInit, ViewWillEnter {
  activeMenu: string = 'Ledger Balances';

  userTransactions: UserTransactions[] = [];
  rowData: UserTransactions[] = [];
  columnDefs: ColDef[] = [];
  defaultColDef: ColDef = { sortable: true, filter: true, resizable: true };
  pagination: boolean = true;
  paginationPageSize: number = 20;
  paginationPageSizeSelector: number[] = [10, 20, 50, 100];
  isLoading: boolean = false;
  transactionUserId: number | null = null;
  
    private gridApi?: GridApi;
    gridOptions = { theme: agGridTheme, context: { componentParent: this } };

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private modalController: ModalController,
    private userService: UserService,
    private userTransactionsService: UserTransactionsService,
    private route: ActivatedRoute
  ) {
    const URLUserId = this.route.snapshot.paramMap.get('id');
    this.transactionUserId = URLUserId ? +URLUserId : null;
  }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.columnDefs = [
      { headerName: 'Sender Name', field: 'paidfromUserName', width: 150, sortable: true, filter: true },
      { headerName: 'Receiver Name', field: 'paidtoUserName', width: 150, sortable: true, filter: true },
      { headerName: 'Transaction Type', field: 'transactionType', width: 150, sortable: true, filter: true },
      { headerName: 'Amount', field: 'amount', width: 100, sortable: true, filter: true },
      { headerName: 'Created By', field: 'createdBy', width: 150, sortable: true, filter: true },
      { headerName: 'Payment Date', field: 'paymentDate', width: 150, sortable: true, filter: true, 
        valueFormatter: (params) => {
        if (!params.value) return '';
        return new Date(params.value).toLocaleDateString();
        }
      },
      { headerName: 'created Date', field: 'createdDate', width: 150, sortable: true, filter: true, 
        valueFormatter: (params) => {
        if (!params.value) return '';
        return new Date(params.value).toLocaleDateString();
        }
      },
    ]; 
  }

  ionViewWillEnter(): void {
    if (this.authService.isAuthenticated()) {
      this.loadUserTransactions();
    }
  }

  async loadUserTransactions(): Promise<void> {
  this.isLoading = true;
  const loading = await this.loadingController.create({
    message: 'Loading user transactions...',
    spinner: 'crescent'
  });
  await loading.present();

  // Fetch both user transactions and all users in parallel
  forkJoin([
    this.userTransactionsService.getUserTransactions(this.transactionUserId || 0),
    this.userService.getUsers()
  ]).subscribe({
    next: ([userTransactions, users]) => {
      this.userTransactions = userTransactions || [];

      // Create user map with full name (single map, reuse for all user transactions)
      const userMap = new Map();
      users.forEach(user => {
        userMap.set(user.id, `${user.firstName} ${user.lastName}`);
      });

      // Map user transactions with userName
      this.rowData = this.userTransactions.map(ut => ({
        ...ut,
        paidfromUserName: userMap.get(ut.paidFromUserId) || 'Unknown',
        paidtoUserName: userMap.get(ut.paidToUserId) || 'Unknown',
        createdBy: userMap.get(ut.createdBy) || 'Unknown'
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
      this.userTransactions = [];
      this.rowData = [];
      console.error('Error loading data:', error);
      if (error.status !== 404) {
        this.showToast('Error loading user transactions: ' + (error.error?.message || error.message || 'Unknown error'), 'danger');
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


  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

}

