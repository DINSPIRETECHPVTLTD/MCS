import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { ColDef, GridApi, GridReadyEvent, RowSelectionOptions } from 'ag-grid-community';
import { ToastController, LoadingController } from '@ionic/angular';

export interface RecoveryPostingRow {
  selected?: boolean;
  loanId: string;
  loanType: string;
  loanCycle: number;
  memberCode: string;
  memberName: string;
  loanAmount: number;
  currentEMI: number;
  principalDue: number;
  interestDue: number;
  savingsDue: number;
  totalDue: number;
  paidAmount: number;
  advRecoveryCollected: number;
  addlSavings: number;
  prepaidDeath: boolean;
  paymentMode: string;
  payment: string;
}

@Component({
  selector: 'app-recovery-posting',
  templateUrl: './recovery-posting.page.html',
  styleUrls: ['./recovery-posting.page.scss']
})
export class RecoveryPostingComponent implements OnInit, ViewWillEnter {
  activeMenu: string = 'Recovery Posting';
  
  // Filters
  paymentType: 'daily' | 'weekly' | 'monthly' = 'weekly';
  selectedCenter: string = '';
  centers: any[] = [];
  
  // Date
  selectedDate: string = '';
  todayDate: string = '';
  
  // Grid data
  rowData: RecoveryPostingRow[] = [];
  columnDefs: ColDef[] = [];
  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true
  };
  pagination: boolean = true;
  paginationPageSize: number = 20;
  rowSelection: RowSelectionOptions = {
    mode: 'multiRow'
  };
  
  private gridApi?: GridApi;
  selectAllChecked: boolean = false;
  isLoading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {
    // Set today's date
    const today = new Date();
    this.todayDate = today.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Set selected date to today by default (YYYY-MM-DD format for ion-datetime)
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    this.selectedDate = `${year}-${month}-${day}`;
  }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.initializeGrid();
    this.loadData();
  }

  ionViewWillEnter(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadData();
  }

  initializeGrid(): void {
    this.columnDefs = [
      {
        headerName: 'Select',
        field: 'selected',
        width: 80,
        checkboxSelection: true,
        headerCheckboxSelection: true,
        sortable: false,
        filter: false,
        pinned: 'left'
      },
      { field: 'loanId', headerName: 'LoanID', width: 120, sortable: true, filter: true },
      { field: 'loanType', headerName: 'Loan Type', width: 120, sortable: true, filter: true },
      { field: 'loanCycle', headerName: 'Loan Cycle#', width: 120, sortable: true, filter: true },
      { field: 'memberCode', headerName: 'Member Code', width: 130, sortable: true, filter: true },
      { field: 'memberName', headerName: 'Member Name', width: 200, sortable: true, filter: true, flex: 1 },
      { 
        field: 'loanAmount', 
        headerName: 'Loan Amount', 
        width: 130, 
        sortable: true, 
        filter: true,
        valueFormatter: (params) => params.value ? params.value.toFixed(2) : '0.00'
      },
      { field: 'currentEMI', headerName: 'Current EMI#', width: 120, sortable: true, filter: true },
      { 
        field: 'principalDue', 
        headerName: 'Principal Due', 
        width: 130, 
        sortable: true, 
        filter: true,
        valueFormatter: (params) => params.value ? params.value.toFixed(2) : '0.00'
      },
      { 
        field: 'interestDue', 
        headerName: 'Interest Due', 
        width: 130, 
        sortable: true, 
        filter: true,
        valueFormatter: (params) => params.value ? params.value.toFixed(2) : '0.00'
      },
      { 
        field: 'savingsDue', 
        headerName: 'Savings Due', 
        width: 130, 
        sortable: true, 
        filter: true,
        valueFormatter: (params) => params.value ? params.value.toFixed(2) : '0.00'
      },
      { 
        field: 'totalDue', 
        headerName: 'Total Due', 
        width: 130, 
        sortable: true, 
        filter: true,
        valueFormatter: (params) => params.value ? params.value.toFixed(2) : '0.00'
      },
      { 
        field: 'paidAmount', 
        headerName: 'Paid Amount', 
        width: 130, 
        sortable: true, 
        filter: true,
        valueFormatter: (params) => params.value ? params.value.toFixed(2) : '0.00'
      },
      { 
        field: 'advRecoveryCollected', 
        headerName: 'AdvRecovery Collected', 
        width: 180, 
        sortable: true, 
        filter: true,
        valueFormatter: (params) => params.value ? params.value.toFixed(2) : '0.00'
      },
      { field: 'addlSavings', headerName: 'Addl. Savings', width: 130, sortable: true, filter: true },
      {
        field: 'prepaidDeath',
        headerName: 'Prepaid/Death',
        width: 130,
        cellRenderer: (params: any) => {
          return `<input type="checkbox" ${params.value ? 'checked' : ''} />`;
        },
        sortable: false,
        filter: false
      },
      {
        field: 'paymentMode',
        headerName: 'Payment Mode',
        width: 150,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: ['Cash', 'Cheque', 'Online', 'Bank Transfer']
        },
        editable: true,
        sortable: true,
        filter: true
      },
      {
        field: 'payment',
        headerName: 'Payment',
        width: 150,
        editable: true,
        sortable: false,
        filter: false
      }
    ];
  }

  async loadData(): Promise<void> {
    this.isLoading = true;
    // TODO: Load data from API based on filters
    // For now, using static sample data
    this.rowData = [
      {
        loanId: 'L06831',
        loanType: '40 Weeks',
        loanCycle: 7,
        memberCode: 'MMM0053',
        memberName: 'Gotru Lakshmi',
        loanAmount: 40000.00,
        currentEMI: 36,
        principalDue: 1000.00,
        interestDue: 140.00,
        savingsDue: 140.00,
        totalDue: 1280.00,
        paidAmount: 1280.00,
        advRecoveryCollected: 0.00,
        addlSavings: 0,
        prepaidDeath: false,
        paymentMode: 'Cash',
        payment: 'Payment'
      },
      {
        loanId: 'L06777',
        loanType: '40 Weeks',
        loanCycle: 7,
        memberCode: 'MMM0084',
        memberName: 'Boggavarapu Venkata Lakshmi',
        loanAmount: 40000.00,
        currentEMI: 38,
        principalDue: 1000.00,
        interestDue: 140.00,
        savingsDue: 140.00,
        totalDue: 1280.00,
        paidAmount: 1280.00,
        advRecoveryCollected: 0.00,
        addlSavings: 0,
        prepaidDeath: false,
        paymentMode: 'Cash',
        payment: 'Payment'
      },
      {
        loanId: 'L06745',
        loanType: '40 Weeks',
        loanCycle: 5,
        memberCode: 'MMM0123',
        memberName: 'Konda Surya Kumari',
        loanAmount: 30000.00,
        currentEMI: 22,
        principalDue: 750.00,
        interestDue: 105.00,
        savingsDue: 105.00,
        totalDue: 960.00,
        paidAmount: 960.00,
        advRecoveryCollected: 0.00,
        addlSavings: 0,
        prepaidDeath: false,
        paymentMode: 'Cash',
        payment: 'Payment'
      },
      {
        loanId: 'L06689',
        loanType: '40 Weeks',
        loanCycle: 4,
        memberCode: 'MMM0156',
        memberName: 'Pothula Padmavathi',
        loanAmount: 25000.00,
        currentEMI: 29,
        principalDue: 875.00,
        interestDue: 122.50,
        savingsDue: 122.50,
        totalDue: 1120.00,
        paidAmount: 1120.00,
        advRecoveryCollected: 0.00,
        addlSavings: 0,
        prepaidDeath: false,
        paymentMode: 'Cash',
        payment: 'Payment'
      },
      {
        loanId: 'L06612',
        loanType: '40 Weeks',
        loanCycle: 3,
        memberCode: 'MMM0189',
        memberName: 'Sunkara Anitha',
        loanAmount: 20000.00,
        currentEMI: 7,
        principalDue: 625.00,
        interestDue: 87.50,
        savingsDue: 87.50,
        totalDue: 800.00,
        paidAmount: 800.00,
        advRecoveryCollected: 0.00,
        addlSavings: 0,
        prepaidDeath: false,
        paymentMode: 'Cash',
        payment: 'Payment'
      },
      {
        loanId: 'L06578',
        loanType: '40 Weeks',
        loanCycle: 2,
        memberCode: 'MMM0201',
        memberName: 'Vemula Radha',
        loanAmount: 35000.00,
        currentEMI: 21,
        principalDue: 875.00,
        interestDue: 122.50,
        savingsDue: 122.50,
        totalDue: 1120.00,
        paidAmount: 1120.00,
        advRecoveryCollected: 0.00,
        addlSavings: 0,
        prepaidDeath: false,
        paymentMode: 'Cash',
        payment: 'Payment'
      },
      {
        loanId: 'L06534',
        loanType: '40 Weeks',
        loanCycle: 6,
        memberCode: 'MMM0225',
        memberName: 'Yerramsetti Satyavathi',
        loanAmount: 45000.00,
        currentEMI: 42,
        principalDue: 1125.00,
        interestDue: 157.50,
        savingsDue: 157.50,
        totalDue: 1440.00,
        paidAmount: 1440.00,
        advRecoveryCollected: 0.00,
        addlSavings: 0,
        prepaidDeath: false,
        paymentMode: 'Cash',
        payment: 'Payment'
      },
      {
        loanId: 'L06489',
        loanType: '40 Weeks',
        loanCycle: 5,
        memberCode: 'MMM0245',
        memberName: 'Nalluri Padma',
        loanAmount: 30000.00,
        currentEMI: 25,
        principalDue: 750.00,
        interestDue: 105.00,
        savingsDue: 105.00,
        totalDue: 960.00,
        paidAmount: 960.00,
        advRecoveryCollected: 0.00,
        addlSavings: 0,
        prepaidDeath: false,
        paymentMode: 'Cheque',
        payment: 'Payment'
      },
      {
        loanId: 'L06456',
        loanType: '40 Weeks',
        loanCycle: 4,
        memberCode: 'MMM0267',
        memberName: 'Gaddam Lakshmi',
        loanAmount: 25000.00,
        currentEMI: 18,
        principalDue: 625.00,
        interestDue: 87.50,
        savingsDue: 87.50,
        totalDue: 800.00,
        paidAmount: 800.00,
        advRecoveryCollected: 0.00,
        addlSavings: 0,
        prepaidDeath: false,
        paymentMode: 'Cash',
        payment: 'Payment'
      },
      {
        loanId: 'L06423',
        loanType: '40 Weeks',
        loanCycle: 3,
        memberCode: 'MMM0289',
        memberName: 'Korrapati Venkata Lakshmi',
        loanAmount: 40000.00,
        currentEMI: 15,
        principalDue: 1000.00,
        interestDue: 140.00,
        savingsDue: 140.00,
        totalDue: 1280.00,
        paidAmount: 1280.00,
        advRecoveryCollected: 0.00,
        addlSavings: 0,
        prepaidDeath: false,
        paymentMode: 'Online',
        payment: 'Payment'
      },
      {
        loanId: 'L06390',
        loanType: '40 Weeks',
        loanCycle: 7,
        memberCode: 'MMM0301',
        memberName: 'Maddala Sridevi',
        loanAmount: 35000.00,
        currentEMI: 40,
        principalDue: 875.00,
        interestDue: 122.50,
        savingsDue: 122.50,
        totalDue: 1120.00,
        paidAmount: 1120.00,
        advRecoveryCollected: 0.00,
        addlSavings: 0,
        prepaidDeath: false,
        paymentMode: 'Cash',
        payment: 'Payment'
      },
      {
        loanId: 'L06367',
        loanType: '40 Weeks',
        loanCycle: 6,
        memberCode: 'MMM0323',
        memberName: 'Pamulapati Anjali',
        loanAmount: 30000.00,
        currentEMI: 33,
        principalDue: 750.00,
        interestDue: 105.00,
        savingsDue: 105.00,
        totalDue: 960.00,
        paidAmount: 960.00,
        advRecoveryCollected: 0.00,
        addlSavings: 0,
        prepaidDeath: false,
        paymentMode: 'Cash',
        payment: 'Payment'
      },
      {
        loanId: 'L06334',
        loanType: '40 Weeks',
        loanCycle: 5,
        memberCode: 'MMM0345',
        memberName: 'Ravipati Geetha',
        loanAmount: 25000.00,
        currentEMI: 28,
        principalDue: 625.00,
        interestDue: 87.50,
        savingsDue: 87.50,
        totalDue: 800.00,
        paidAmount: 800.00,
        advRecoveryCollected: 0.00,
        addlSavings: 0,
        prepaidDeath: false,
        paymentMode: 'Bank Transfer',
        payment: 'Payment'
      },
      {
        loanId: 'L06301',
        loanType: '40 Weeks',
        loanCycle: 4,
        memberCode: 'MMM0367',
        memberName: 'Sabbella Padmaja',
        loanAmount: 40000.00,
        currentEMI: 20,
        principalDue: 1000.00,
        interestDue: 140.00,
        savingsDue: 140.00,
        totalDue: 1280.00,
        paidAmount: 1280.00,
        advRecoveryCollected: 0.00,
        addlSavings: 0,
        prepaidDeath: false,
        paymentMode: 'Cash',
        payment: 'Payment'
      },
      {
        loanId: 'L06278',
        loanType: '40 Weeks',
        loanCycle: 3,
        memberCode: 'MMM0389',
        memberName: 'Tadikonda Swathi',
        loanAmount: 35000.00,
        currentEMI: 12,
        principalDue: 875.00,
        interestDue: 122.50,
        savingsDue: 122.50,
        totalDue: 1120.00,
        paidAmount: 1120.00,
        advRecoveryCollected: 0.00,
        addlSavings: 0,
        prepaidDeath: false,
        paymentMode: 'Cash',
        payment: 'Payment'
      }
    ];
    
    // Simulate API delay
    setTimeout(() => {
      this.isLoading = false;
      if (this.gridApi) {
        this.gridApi.setGridOption('rowData', this.rowData);
        setTimeout(() => {
          this.gridApi?.sizeColumnsToFit();
        }, 100);
      }
    }, 500);
    
    // Sample data structure - replace with actual API call
    // this.recoveryPostingService.getPostingData(this.selectedDate, this.paymentType, this.selectedCenter)
    //   .subscribe(data => {
    //     this.rowData = data;
    //     this.isLoading = false;
    //   });
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    if (this.rowData && this.rowData.length > 0) {
      this.gridApi.setGridOption('rowData', this.rowData);
    }
    setTimeout(() => {
      this.gridApi?.sizeColumnsToFit();
    }, 100);
  }

  onSelectionChanged(): void {
    const selectedRows = this.gridApi?.getSelectedRows();
    this.selectAllChecked = selectedRows ? selectedRows.length === this.rowData.length && this.rowData.length > 0 : false;
  }

  selectAll(): void {
    if (this.gridApi) {
      this.gridApi.selectAll();
      this.selectAllChecked = true;
    }
  }

  deselectAll(): void {
    if (this.gridApi) {
      this.gridApi.deselectAll();
      this.selectAllChecked = false;
    }
  }

  async postSelected(): Promise<void> {
    const selectedRows = this.gridApi?.getSelectedRows();
    if (!selectedRows || selectedRows.length === 0) {
      const toast = await this.toastController.create({
        message: 'Please select at least one row to post',
        duration: 2000,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Posting selected entries...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // TODO: Implement POST API call
      // await this.recoveryPostingService.postEntries(selectedRows);
      
      loading.dismiss();
      const toast = await this.toastController.create({
        message: `Successfully posted ${selectedRows.length} entry/entries`,
        duration: 2000,
        color: 'success',
        position: 'top'
      });
      await toast.present();
      
      // Reload data
      this.loadData();
    } catch (error) {
      loading.dismiss();
      const toast = await this.toastController.create({
        message: 'Error posting entries. Please try again.',
        duration: 3000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
    }
  }

  close(): void {
    // TODO: Implement close functionality
    this.router.navigate(['/home']);
  }

  onPaymentTypeChange(): void {
    this.loadData();
  }

  onCenterChange(): void {
    this.loadData();
  }

  onDateChange(): void {
    this.loadData();
  }

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

  onBranchChange(branch: Branch): void {
    console.log('Branch changed to:', branch);
  }
}
