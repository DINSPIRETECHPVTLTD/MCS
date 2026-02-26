import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { ColDef, GridApi, GridReadyEvent, RowSelectionOptions } from 'ag-grid-community';
import { agGridTheme } from '../../ag-grid-theme';
import { ToastController, LoadingController } from '@ionic/angular';
import { ModalController } from '@ionic/angular';
import { UserService } from '../../services/user.service';
import { ExpensesService } from '../../services/expenses.service';
import { AddExpensesComponent } from './add-expense.component';
import { forkJoin } from 'rxjs';
import { Expenses } from 'src/app/models/expenses.models';

@Component({
  selector: 'app-expenses',
  templateUrl: './expenses.page.html',
  styleUrls: ['./expenses.page.scss']
})
export class ExpensesComponent implements OnInit, ViewWillEnter {
  activeMenu: string = 'Expenses';

  expenses: Expenses[] = [];
  rowData: Expenses[] = [];
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
    private expensesService: ExpensesService ,
    private userService: UserService
  ) {
    
  }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.columnDefs = [
      { headerName: 'User Name', field: 'paidfromUserName', width: 150, sortable: true, filter: true },
      { headerName: 'Amount', field: 'amount', width: 100, sortable: true, filter: true },
      { headerName: 'Description', field: 'comments', width: 200, sortable: true, filter: true },
      { headerName: 'Expense Date', field: 'paymentDate', width: 100, sortable: true, filter: true, 
        valueFormatter: (params) => {
        if (!params.value) return '';
        return new Date(params.value).toLocaleDateString();
        }
      },
      { headerName: 'Entered Date', field: 'createdDate', width: 100, sortable: true, filter: true, 
        valueFormatter: (params) => {
        if (!params.value) return '';
        return new Date(params.value).toLocaleDateString();
        }
      },
    ]; 
  }

  ionViewWillEnter(): void {
    if (this.authService.isAuthenticated()) {
      this.loadExpenses();
    }
  }

  async loadExpenses(): Promise<void> {
  this.isLoading = true;
  const loading = await this.loadingController.create({
    message: 'Loading expenses...',
    spinner: 'crescent'
  });
  await loading.present();

  // Fetch both expenses and all users in parallel
  forkJoin([
    this.expensesService.getExpenses(),
    this.userService.getUsers()
  ]).subscribe({
    next: ([expenses, users]) => {
      this.expenses = expenses || [];

      console.log('Fetched expenses:', this.expenses);

      // Create user map with full name (single map, reuse for all expenses)
      const userMap = new Map();
      users.forEach(user => {
        userMap.set(user.id, `${user.firstName} ${user.lastName}`);
      });

      // Map expenses with userName
      this.rowData = this.expenses.map(exp => ({
        ...exp,
        paidfromUserName: userMap.get(exp.paidFromUserId) || 'Unknown'
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
      this.expenses = [];
      this.rowData = [];
      console.error('Error loading data:', error);
      if (error.status !== 404) {
        this.showToast('Error loading expenses: ' + (error.error?.message || error.message || 'Unknown error'), 'danger');
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

  async openAddExpenseModal(): Promise<void> {
    const modal = await this.modalController.create({
      component: AddExpensesComponent,
      cssClass: 'add-expense-modal'
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data && data.success) {
      // Refresh expenses list after successful save
      this.loadExpenses();
    }
  }

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

}

