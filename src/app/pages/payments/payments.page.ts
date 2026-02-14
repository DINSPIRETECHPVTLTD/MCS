import { Component, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { PaymentsService } from '../../services/payments.service';
import { Payment } from '../../models/payment.models';
import { Branch } from '../../models/branch.models';
import { AddPaymentModalComponent } from './add-payment-modal.component';
import { EditPaymentModalComponent } from './edit-payment-modal.component';
import { ColDef, GridApi, GridOptions, ICellRendererParams } from 'ag-grid-community';
import { agGridTheme } from '../../ag-grid-theme';

@Component({
  selector: 'app-payments',
  templateUrl: './payments.page.html',
  styleUrls: ['./payments.page.scss']
})
export class PaymentsPage implements OnInit {
  activeMenu: string = 'Payment Terms';
  payments: Payment[] = [];
  rowData: Payment[] = [];
  isLoading = false;

  columnDefs: ColDef<Payment>[] = [
    { headerName: 'Payment Term ID', field: 'id', width: 120, sortable: true, filter: true },
    {
      headerName: 'Payment Term',
      field: 'paymentTerm',
      sortable: true,
      filter: true,
      flex: 1,
      minWidth: 140
    },
    { headerName: 'No. of Terms', field: 'noOfTerms', sortable: true, filter: true, width: 120 },
    {
      headerName: 'Processing Fee',
      field: 'processingFee',
      sortable: true,
      filter: true,
      flex: 1,
      minWidth: 140
    },
    { headerName: 'ROI', field: 'roi', sortable: true, filter: true, width: 100 },
    {
      headerName: 'Insurance Fee',
      field: 'insuranceFee',
      sortable: true,
      filter: true,
      flex: 1,
      minWidth: 140
    },
    {
      headerName: 'Actions',
      colId: 'actions',
      width: 200,
      minWidth: 200,
      maxWidth: 200,
      suppressSizeToFit: true,
      sortable: false,
      filter: false,
      cellRenderer: (params: ICellRendererParams<Payment>) => {
        const container = document.createElement('div');
        container.className = 'actions-cell';
        container.innerHTML = `
          <button class="ag-btn ag-edit">Edit</button>
          <button class="ag-btn ag-delete">Inactive</button>
        `;
        const editBtn = container.querySelector('.ag-edit');
        const delBtn = container.querySelector('.ag-delete');
        if (editBtn) editBtn.addEventListener('click', () => {
          const row = params.data;
          if (row) params.context.componentParent.openEditPaymentModal(row);
        });
        if (delBtn) delBtn.addEventListener('click', () => {
          const row = params.data;
          if (row) params.context.componentParent.confirmDelete(row);
        });
        return container;
      }
    }
  ];
  defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    filter: true,
    floatingFilter: false
  };

  pagination: boolean = true;
  paginationPageSize: number = 100;
  paginationPageSizeSelector: number[] = [10, 20, 50, 100, 500];

  private gridApi?: GridApi<Payment>;
  gridOptions: GridOptions<Payment> = {
    theme: agGridTheme,
    context: { componentParent: this },
    suppressPaginationPanel: false,
    suppressMovableColumns: true,
    suppressDragLeaveHidesColumns: true,
    suppressColumnMoveAnimation: true,
    rowHeight: 44,
    headerHeight: 44
  };

  constructor(
    private paymentsService: PaymentsService,
    private modalController: ModalController,
    private toastController: ToastController
  ) {}

  ngOnInit(): void {
    this.loadPayments();
  }

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

  onBranchChange(_branch: Branch): void {}

  loadPayments(): void {
    this.isLoading = true;
    this.paymentsService.getPayments().subscribe({
      next: (payments: Payment[]) => {
        this.payments = payments;
        this.rowData = payments;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.showToast('Error loading payment terms: ' + (err?.error?.message || err?.message || 'Unknown error'), 'danger');
      }
    });
  }

  async openAddPaymentModal() {
    const modal = await this.modalController.create({
      component: AddPaymentModalComponent
    });
    modal.onDidDismiss().then((result) => {
      if (result.data?.refresh) {
        this.loadPayments();
        this.showToast('Payment term added successfully', 'success');
      }
    });
    return modal.present();
  }

  async openEditPaymentModal(payment: Payment, readOnly = false) {
    const modal = await this.modalController.create({
      component: EditPaymentModalComponent,
      componentProps: { payment, readOnly }
    });
    modal.onDidDismiss().then((result) => {
      if (result.data?.refresh) {
        this.loadPayments();
        if (!readOnly) this.showToast('Payment term updated successfully', 'success');
      }
    });
    return modal.present();
  }

  confirmDelete(payment: Payment) {
    if (confirm('Are you sure you want to delete this payment term?')) {
      this.paymentsService.deletePayment(payment.id).subscribe({
        next: () => {
          this.loadPayments();
          this.showToast('Payment term deleted successfully', 'success');
        },
        error: (err) => {
          this.showToast(err?.error?.message || 'Failed to delete payment term', 'danger');
        }
      });
    }
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success'): Promise<void> {
    if (!message) return;
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
