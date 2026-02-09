import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController, ToastController, LoadingController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { MemberService } from '../../services/member.service';
import { Member } from '../../models/member.models';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { agGridTheme } from '../../ag-grid-theme';
import { Branch } from '../../models/branch.models';
import { AddLoanModalComponent } from './add-loan-modal.component';

@Component({
  selector: 'app-add-loan',
  templateUrl: './add-loan.page.html',
  styleUrls: ['./add-loan.page.scss']
})
export class AddLoanComponent implements OnInit {
  activeMenu: string = 'Add Loan';
  
  // Member search (first name, last name, member ID)
  searchFirstName: string = '';
  searchLastName: string = '';
  searchMemberId: string = '';
  searchResults: Member[] = [];
  isSearching: boolean = false;
  showMemberGrid: boolean = false;
  
  // AG Grid configuration
  rowData: Member[] = [];
  columnDefs: ColDef[] = [
    {
      headerName: 'Member ID',
      valueGetter: (params) => {
        const data = params.data as Member;
        return (data as Member)?.memberId ?? (data as Member)?.id ?? '';
      },
      width: 120,
      sortable: true,
      filter: true
    },
    {
      headerName: 'First Name',
      valueGetter: (params) => (params.data as Member)?.firstName ?? '',
      width: 130,
      sortable: true,
      filter: true
    },
    {
      headerName: 'Last Name',
      valueGetter: (params) => (params.data as Member)?.lastName ?? '',
      width: 130,
      sortable: true,
      filter: true
    },
    {
      field: 'age',
      headerName: 'Age',
      width: 80,
      sortable: true,
      filter: true
    },
    {
      headerName: 'Select',
      width: 100,
      sortable: false,
      filter: false,
      cellRenderer: (params: { data: Member; context?: { component: AddLoanComponent } }) => {
        const btn = document.createElement('button');
        btn.className = 'ag-select-btn';
        btn.textContent = 'Select';
        const comp = (params.context as { component?: AddLoanComponent })?.component ?? this;
        btn.addEventListener('click', () => comp.selectMemberFromGrid(params.data));
        return btn;
      }
    }
  ];
  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true
  };
  pagination: boolean = true;
  paginationPageSize: number = 10;

  private gridApi?: GridApi;
  gridOptions = { theme: agGridTheme };
  /** Passed to AG Grid so Select button can call back into this component */
  get gridContext(): { component: AddLoanComponent } {
    return { component: this };
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    private memberService: MemberService,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private modalController: ModalController,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
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

  async searchMembers(): Promise<void> {
    const first = this.searchFirstName?.trim() ?? '';
    const last = this.searchLastName?.trim() ?? '';
    const id = this.searchMemberId?.trim() ?? '';
    if (!first && !last && !id) {
      const toast = await this.toastController.create({
        message: 'Enter at least one search: First Name, Last Name, or Member ID',
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

    this.memberService.searchMembersByCriteria({
      firstName: first || undefined,
      lastName: last || undefined,
      memberId: id || undefined
    }).subscribe({
      next: (members: Member[]) => {
        this.searchResults = members;
        this.rowData = members;
        this.showMemberGrid = true;
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
          setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);
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
  }

  /** Called when user clicks Select on a row; opens loan modal */
  async selectMemberFromGrid(member: Member): Promise<void> {
    const modal = await this.modalController.create({
      component: AddLoanModalComponent,
      componentProps: {
        selectedMember: member
      },
      cssClass: 'loan-modal'
    });

    await modal.present();
    
    const { data, role } = await modal.onWillDismiss();
    
    if (role === 'success' && data && data.reset) {
      // Reset to initial search state
      this.showMemberGrid = false;
      this.rowData = [];
      this.searchFirstName = '';
      this.searchLastName = '';
      this.searchMemberId = '';
      this.cdr.detectChanges();
    }
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.setGridOption('context', { component: this });
    if (this.rowData && this.rowData.length > 0) {
      this.gridApi.setGridOption('rowData', this.rowData);
    }
    setTimeout(() => {
      this.gridApi?.sizeColumnsToFit();
    }, 100);
  }

  onSearchKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.searchMembers();
    }
  }
}
