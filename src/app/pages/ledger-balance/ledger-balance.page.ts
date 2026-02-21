import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { ColDef, GridApi, GridReadyEvent, RowSelectionOptions } from 'ag-grid-community';
import { agGridTheme } from '../../ag-grid-theme';
import { ToastController, LoadingController } from '@ionic/angular';
import { LedgerBalances } from 'src/app/models/ledger-balance.modal';
import { AddFundTransferComponent } from './fund-transfer-modal.component';
import { ModalController } from '@ionic/angular';
import { LedgerBalanceService } from '../../services/ledger-balance.service';
import { UserService } from '../../services/user.service';
import { forkJoin } from 'rxjs';
import { NgZone, ApplicationRef } from '@angular/core';

@Component({
  selector: 'app-ledger-balance',
  templateUrl: './ledger-balance.page.html',
  styleUrls: ['./ledger-balance.page.scss']
})
export class LedgerBalanceComponent implements OnInit, ViewWillEnter {
  activeMenu: string = 'Ledger Balances';

  ledgerbalances: LedgerBalances[] = [];
  rowData: LedgerBalances[] = [];
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
    private ledgerBalanceService: LedgerBalanceService,
    private userService: UserService,
    private ngZone: NgZone,
    private appRef: ApplicationRef
  ) {
    
  }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.columnDefs = [
      { headerName: 'User Name', field: 'userName', width: 100, sortable: true, filter: true },
      { headerName: 'Amount', field: 'amount', width: 100, sortable: true, filter: true },
      { headerName: 'Actions',field: 'actions', width: 100,
        sortable: false,
        filter: false,
        resizable: false,
        cellRenderer: (params: any) => {
          const container = document.createElement('div');
          container.className = 'actions-cell';
          container.style.display = 'flex';
          container.style.gap = '6px';
          container.style.alignItems = 'center';
          container.innerHTML = `
            <button class="ag-btn ag-navigate">Open Transaction</button>
          `;
          const navigateBtn = container.querySelector('.ag-navigate');
          if (navigateBtn) navigateBtn.addEventListener('click', () => params.context.componentParent.openTransaction(params.data));
          return container;
        }
      }
    ]; 
  }

  ionViewWillEnter(): void {
    if (this.authService.isAuthenticated()) {
      this.loadLedgerBalances();
    }
  }

  async loadLedgerBalances(): Promise<void> {
  this.isLoading = true;
  const loading = await this.loadingController.create({
    message: 'Loading ledger balances...',
    spinner: 'crescent'
  });
  await loading.present();

  // Fetch both ledger balances and all users in parallel
  forkJoin([
    this.ledgerBalanceService.getLedgerBalances(),
    this.userService.getUsers()
  ]).subscribe({
    next: ([ledgerBalances, users]) => {
      this.ledgerbalances = ledgerBalances || [];

      // Create user map with full name (single map, reuse for all ledger balances)
      const userMap = new Map();
      users.forEach(user => {
        userMap.set(user.id, `${user.firstName} ${user.lastName}`);
      });

      // Map ledger balances with userName
      this.rowData = this.ledgerbalances.map(lb => ({
        ...lb,
        userName: userMap.get(lb.userId) || 'Unknown'
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
      this.ledgerbalances = [];
      this.rowData = [];
      console.error('Error loading data:', error);
      if (error.status !== 404) {
        this.showToast('Error loading ledger balances: ' + (error.error?.message || error.message || 'Unknown error'), 'danger');
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

  async openAddFundTransferModal(): Promise<void> {
    const modal = await this.modalController.create({
      component: AddFundTransferComponent,
      cssClass: 'add-fund-transfer-modal'
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data && data.success) {
      // Refresh ledger balances list after successful save
      this.loadLedgerBalances();
    }
  }

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

  openTransaction(data: { userId: number }): void {
    this.ngZone.run(() => {
      this.router.navigate(['/user-transactions', data.userId], { replaceUrl: true }).then((success) => {
        if (success) {
          this.ngZone.run(() => this.appRef.tick());
        }
      });
    });
  }

}

