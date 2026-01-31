import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { MemberService } from '../../services/member.service';
import { Member } from '../../models/member.models';
import { ColDef, GridApi, GridReadyEvent, RowSelectionOptions } from 'ag-grid-community';
import { ToastController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-add-loan',
  templateUrl: './add-loan.page.html',
  styleUrls: ['./add-loan.page.scss']
})
export class AddLoanComponent implements OnInit, ViewWillEnter {
  activeMenu: string = 'Add Loan';
  
  // Step management
  step1Expanded: boolean = true;
  step2Expanded: boolean = false;
  step3Expanded: boolean = false;
  
  // Member search
  searchTerm: string = '';
  searchResults: Member[] = [];
  selectedMember: Member | null = null;
  isSearching: boolean = false;
  
  // AG Grid configuration
  rowData: Member[] = [];
  columnDefs: ColDef[] = [
    {
      headerName: 'Member ID',
      valueGetter: (params) => {
        const data = params.data as Member;
        return (data as any)?.memberId ?? (data as any)?.id ?? '';
      },
      width: 150,
      sortable: true,
      filter: true
    },
    {
      field: 'fullName',
      headerName: 'Member Name',
      valueGetter: (params) => {
        const data = params.data as Member;
        return `${data.firstName || ''} ${data.lastName || ''}`.trim();
      },
      sortable: true,
      filter: true,
      flex: 1
    },
    {
      field: 'age',
      headerName: 'Age',
      width: 100,
      sortable: true,
      filter: true
    }
  ];
  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true
  };
  pagination: boolean = true;
  paginationPageSize: number = 10;
  rowSelection: RowSelectionOptions = {
    mode: 'singleRow'
  };
  
  private gridApi?: GridApi;

  constructor(
    private authService: AuthService,
    private router: Router,
    private memberService: MemberService,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) { }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
  }

  ionViewWillEnter(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
  }

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

  onBranchChange(_branch: Branch): void {
    // Handle branch change if needed
  }

  toggleStep(step: number): void {
    if (step === 1) {
      this.step1Expanded = !this.step1Expanded;
    } else if (step === 2) {
      this.step2Expanded = !this.step2Expanded;
    } else if (step === 3) {
      this.step3Expanded = !this.step3Expanded;
    }
  }

  async searchMembers(): Promise<void> {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      const toast = await this.toastController.create({
        message: 'Please enter a search term',
        duration: 2000,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    this.isSearching = true;
    const loading = await this.loadingController.create({
      message: 'Searching members...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      this.memberService.searchMembers(this.searchTerm.trim()).subscribe({
        next: (members: Member[]) => {
          this.searchResults = members;
          this.rowData = members;
          loading.dismiss();
          this.isSearching = false;
          
          if (members.length === 0) {
            this.toastController.create({
              message: 'No members found',
              duration: 2000,
              color: 'warning',
              position: 'top'
            }).then(toast => toast.present());
          } else {
            // Auto-size columns after data is loaded
            setTimeout(() => {
              this.gridApi?.sizeColumnsToFit();
            }, 100);
          }
        },
        error: (error: unknown) => {
          console.error('Error searching members:', error);
          loading.dismiss();
          this.isSearching = false;
          this.toastController.create({
            message: 'Error searching members. Please try again.',
            duration: 3000,
            color: 'danger',
            position: 'top'
          }).then(toast => toast.present());
        }
      });
    } catch (error) {
      loading.dismiss();
      this.isSearching = false;
    }
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
    if (selectedRows && selectedRows.length > 0) {
      this.selectedMember = selectedRows[0] as Member;
      // Expand step 2 and collapse step 1
      this.step1Expanded = false;
      this.step2Expanded = true;
    }
  }

  onSearchKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.searchMembers();
    }
  }
}
