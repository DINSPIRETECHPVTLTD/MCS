import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import {
  ViewWillEnter,
  ModalController,
  ToastController
} from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { BranchService } from '../../services/branch.service';
import { Branch } from '../../models/branch.models';
import { CenterService } from '../../services/center.service';
import { Center } from '../../models/center.models';
import { UserContextService } from '../../services/user-context.service';
import { AddCenterModalComponent } from './add-center-modal.component';
import { EditCenterModalComponent } from './edit-center-modal.component';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { ColDef, GridApi, GridOptions, GridReadyEvent, ICellRendererParams } from 'ag-grid-community';
import { agGridTheme } from '../../ag-grid-theme';


@Component({
  selector: 'app-centers',
  templateUrl: './centers.page.html'
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class CentersPage implements OnInit, ViewWillEnter {
  activeMenu: string = 'Centers';
  centers: Center[] = [];
  rowData: Center[] = [];
  isLoading = false;

  selectedBranchId: number | null = null;
  selectedBranchName: string = '';

  // AG Grid
  columnDefs: ColDef<Center>[] = [];
  defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    filter: true,
    floatingFilter: false
  };

  pagination: boolean = true;
  paginationPageSize: number = 20;
  paginationPageSizeSelector: number[] = [10, 20, 50, 100];

  paginationPageSize_old = 5;
  paginatorLength = 0;
  paginatorPageIndex = 0;

  // Dynamic grid height (shrinks when pageSize is small)
  private readonly gridRowHeightPx = 44;
  private readonly gridHeaderHeightPx = 44;
  gridHeightPx = 320;

  private gridApi?: GridApi<Center>;
  private lastColumnState: unknown = null;

  gridOptions: GridOptions<Center> = {
    theme: agGridTheme,
    context: { componentParent: this },
    suppressPaginationPanel: false,

    // Lock table adjustments from the UI
    suppressMovableColumns: true,
    suppressDragLeaveHidesColumns: true,
    suppressColumnMoveAnimation: true,

    // Keep consistent sizing so we can compute the grid height.
    rowHeight: 44,
    headerHeight: 44
  };

  @ViewChild(MatPaginator) paginator?: MatPaginator;

  constructor(
    private authService: AuthService,
    private router: Router,
    private centerService: CenterService,
    private branchService: BranchService,
    private userContext: UserContextService,
    private modalController: ModalController,
    private toastController: ToastController
  ) { }

  private normalizeCenter(raw: unknown, branchName: string, branchId?: number): Center {
    const rec = (raw ?? {}) as Record<string, unknown>;
    const idNum = Number(rec['id'] ?? rec['Id'] ?? (raw as any)?.id ?? 0);
    const id = Number.isFinite(idNum) && idNum > 0 ? idNum : undefined;

    const centerName = (
      rec['centerName'] ?? rec['CenterName'] ?? rec['name'] ?? rec['Name'] ?? (raw as any)?.centerName ?? (raw as any)?.name ?? ''
    ).toString();

    const centerAddress = (
      rec['centerAddress'] ?? rec['CenterAddress'] ?? rec['address'] ?? rec['Address'] ?? (raw as any)?.centerAddress ?? ''
    ).toString();

    const city = (
      rec['city'] ?? rec['City'] ?? (raw as any)?.city ?? ''
    ).toString();

    return {
      id,
      centerName,
      centerAddress,
      city,
      branchName: (branchName ?? '').toString(),
      branchId
    };
  }

  private getSelectedBranchId(): number | null {
    const fromContext = this.userContext.branchId;
    if (fromContext != null) return fromContext;

    try {
      const raw = localStorage.getItem('selected_branch_id');
      if (!raw) return null;
      const num = Number(raw);
      return Number.isNaN(num) ? null : num;
    } catch {
      return null;
    }
  }


  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.columnDefs = [
      // Explicitly define these as hidden so they never show up as extra columns.
      { field: 'id', hide: true },
      { field: 'branchId', hide: true },
      {
        headerName: 'Center Name',
        field: 'centerName',
        flex: 1,
        pinned: 'left'
      },
      {
        headerName: 'Center Address',
        field: 'centerAddress',
        flex: 1.5,
        tooltipField: 'centerAddress',
        cellClass: 'truncate'
      },
      {
        headerName: 'City',
        field: 'city',
        flex: 1
      },
      {
        headerName: 'Branch Name',
        field: 'branchName',
        flex: 1,
        hide: true
      },
      {
        headerName: 'Actions',
        colId: 'actions',
        pinned: 'right',
        width: 200,
        sortable: false,
        filter: false,
        resizable: false,
        cellRenderer: (params: ICellRendererParams<Center>) => {
          const container = document.createElement('div');
          container.className = 'actions-cell';
          container.innerHTML = `
            <button class="ag-btn ag-edit">Edit</button>
            <button class="ag-btn ag-delete">Delete</button>
          `;

          const editBtn = container.querySelector('.ag-edit');
          const delBtn = container.querySelector('.ag-delete');
          if (editBtn) editBtn.addEventListener('click', () => params.context.componentParent.editCenter(params.data));
          if (delBtn) delBtn.addEventListener('click', () => params.context.componentParent.deleteCenter(params.data));
          return container;
        }
      }
    ];
  }

  // ViewChild setters handle paginator/sort wiring even when the table is created via *ngIf.

  ionViewWillEnter(): void {
    // Reload data when page becomes active
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    // Auto-load filtered centers when user navigates to Centers
    // (e.g. after clicking Navigate on a branch)
    void this.loadCenters();
  }

  onGridReady(event: GridReadyEvent<Center>): void {
    this.gridApi = event.api;
    // Force column definitions to avoid any auto-generated columns.
    this.gridApi.setGridOption('columnDefs', this.columnDefs);
    this.gridApi.setGridOption('rowData', this.rowData);
    this.gridApi.setGridOption('paginationPageSize', this.paginationPageSize);
    this.gridApi.paginationGoToPage(this.paginatorPageIndex);
    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);
    this.syncPaginatorFromGrid();
    this.updateGridHeight();
  }

  onSortChanged(): void {
    if (!this.gridApi) return;
    this.lastColumnState = this.gridApi.getColumnState();
    this.syncPaginatorFromGrid();
  }

  onPageChanged(event: PageEvent): void {
    this.paginationPageSize = event.pageSize;
    this.paginatorPageIndex = event.pageIndex;
    if (!this.gridApi) return;

    const pageSizeChanged = this.gridApi.paginationGetPageSize() !== event.pageSize;
    if (pageSizeChanged) {
      this.gridApi.setGridOption('paginationPageSize', event.pageSize);
      this.paginatorPageIndex = 0;
      this.gridApi.paginationGoToFirstPage();
    } else {
      this.gridApi.paginationGoToPage(event.pageIndex);
    }

    this.syncPaginatorFromGrid();
    this.updateGridHeight();
  }


  private syncPaginatorFromGrid(): void {
    if (!this.gridApi) {
      this.paginatorLength = this.rowData.length;
      return;
    }
    this.paginatorLength = this.gridApi.getDisplayedRowCount();
    this.paginatorPageIndex = this.gridApi.paginationGetCurrentPage();
  }

  private updateGridHeight(): void {
    const total = this.gridApi ? this.gridApi.getDisplayedRowCount() : this.rowData.length;
    const pageSize = this.paginationPageSize;
    const pageIndex = this.gridApi ? this.gridApi.paginationGetCurrentPage() : this.paginatorPageIndex;

    const start = pageIndex * pageSize;
    const remaining = Math.max(total - start, 0);
    const rowsOnPage = Math.max(1, Math.min(pageSize, remaining || pageSize));

    const base = this.gridHeaderHeightPx + 2; // +2 for borders
    const height = base + rowsOnPage * this.gridRowHeightPx;
    this.gridHeightPx = Math.max(220, height);
  }

  private getPrintableRows(): Center[] {
    if (!this.gridApi) {
      return this.rowData;
    }
    const rows: Center[] = [];
    this.gridApi.forEachNodeAfterFilterAndSort(node => {
      if (node.data) rows.push(node.data);
    });
    return rows;
  }

  exportCentersToCSV(): void {
    const exportableColumns = ['centerName', 'centerAddress', 'city', 'branchName'];

    if (this.gridApi) {
      this.gridApi.exportDataAsCsv({
        fileName: 'centers.csv',
        columnKeys: exportableColumns
      });
      return;
    }

    // Fallback (should rarely happen, e.g. if grid not ready yet)
    const rows = this.rowData;
    const headers = exportableColumns;
    const csv = [headers.join(',')]
      .concat(
        rows.map(row =>
          headers
            .map(h => {
              const value = (row as unknown as Record<string, unknown>)[h] ?? '';
              return '"' + value.toString().replace(/"/g, '""') + '"';
            })
            .join(',')
        )
      )
      .join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'centers.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  printCentersTable(): void {
    const rows = this.getPrintableRows();
    const printableFields: Array<keyof Center> = ['centerName', 'centerAddress', 'city', 'branchName'];
    const columns = printableFields.map(field => {
      const def = this.columnDefs.find(c => c.field === field);
      return {
        field: field as string,
        header: (def?.headerName ?? field).toString()
      };
    });

    let html = '<table border="1" style="border-collapse:collapse;width:100%">';
    html += '<thead><tr>' + columns.map(c => `<th style="padding:4px 8px">${c.header}</th>`).join('') + '</tr></thead>';
    html +=
      '<tbody>' +
      rows
        .map(
          row =>
            '<tr>' +
            columns
              .map(c => {
                const value = (row as unknown as Record<string, unknown>)[c.field] ?? '';
                return `<td style="padding:4px 8px">${value.toString()}</td>`;
              })
              .join('') +
            '</tr>'
        )
        .join('') +
      '</tbody></table>';
    const win = window.open('', '', 'width=900,height=700');
    win!.document.write('<html><head><title>Centers Table</title></head><body>' + html + '</body></html>');
    win!.print();
    win!.close();
  }

  // Centers are auto-loaded on enter; keep filter fields intact between navigations.

  async openAddCenterModal(): Promise<void> {
    const modal = await this.modalController.create({
      component: AddCenterModalComponent,
      cssClass: 'add-center-modal'
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data && data.created) {
      await this.loadCenters(true);
      await this.showToast('Center created successfully', 'success');
    }
  }

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

  onBranchChange(branch: Branch): void {
    void branch;
  }

  private async loadCenters(forceRefresh: boolean = false): Promise<void> {
    if (this.isLoading) return;

    const selectedBranchId = this.getSelectedBranchId();

    // Avoid reloading (and re-showing the loader) when the user taps the Centers menu again
    // and nothing relevant changed.
    if (!forceRefresh && this.rowData.length > 0 && this.selectedBranchId === selectedBranchId) {
      return;
    }

    this.isLoading = true;
    this.selectedBranchId = selectedBranchId;
    this.selectedBranchName = '';

    // Fetch both centers and branches in parallel
    this.centerService.getAllCenters().subscribe({
      next: async (centers) => {
        this.branchService.getBranches().subscribe({
          next: async branches => {
            const branchMap = new Map(branches.map(b => [Number(b.id), b.name]));
            const selectedBranchName = selectedBranchId != null ? (branchMap.get(Number(selectedBranchId)) || '') : '';
            this.selectedBranchName = selectedBranchName;

            const mapped = (centers ?? []).map(center => {
              const centerRec = center as unknown as Record<string, unknown>;
              const bIdNum = Number(centerRec['branchId'] ?? centerRec['BranchId'] ?? (center as any)?.branchId ?? 0);
              const branchId = Number.isFinite(bIdNum) && bIdNum > 0 ? bIdNum : undefined;
              const branchName = branchMap.get(Number(branchId ?? 0)) || (center as any)?.branchName || '';
              return this.normalizeCenter(center, branchName, branchId);
            });

            // If a branch is selected (e.g. user clicked Navigate), show only that branch's centers
            this.centers = selectedBranchId != null
              ? mapped.filter(c => Number(c.branchId) === Number(selectedBranchId) || (!!selectedBranchName && c.branchName === selectedBranchName))
              : mapped;

            this.rowData = [...this.centers];
            if (this.gridApi) {
              this.gridApi.setGridOption('rowData', this.rowData);
              this.gridApi.paginationGoToFirstPage();
              this.paginatorPageIndex = 0;
            }
            this.syncPaginatorFromGrid();
            this.updateGridHeight();
            this.isLoading = false;
          },
          error: async () => {
            // If branches fail to load, still filter by branchId if present
            const mapped = (centers ?? []).map(center => {
              const centerRec = center as unknown as Record<string, unknown>;
              const bIdNum = Number(centerRec['branchId'] ?? centerRec['BranchId'] ?? (center as any)?.branchId ?? 0);
              const branchId = Number.isFinite(bIdNum) && bIdNum > 0 ? bIdNum : undefined;
              return this.normalizeCenter(center, (center as any)?.branchName || '', branchId);
            });
            this.centers = selectedBranchId != null
              ? mapped.filter(c => Number(c.branchId) === Number(selectedBranchId))
              : mapped;

            this.rowData = [...this.centers];
            if (this.gridApi) {
              this.gridApi.setGridOption('rowData', this.rowData);
              this.gridApi.paginationGoToFirstPage();
              this.paginatorPageIndex = 0;
            }
            this.syncPaginatorFromGrid();
            this.updateGridHeight();
            this.isLoading = false;
            await this.showToast('Failed to load branches.', 'danger');
          }
        });
      },
      error: async () => {
        this.centers = [];
        this.rowData = [];
        if (this.gridApi) {
          this.gridApi.setGridOption('rowData', this.rowData);
          this.gridApi.paginationGoToFirstPage();
          this.paginatorPageIndex = 0;
        }
        this.syncPaginatorFromGrid();
        this.updateGridHeight();
        this.isLoading = false;
        await this.showToast('Failed to load centers.', 'danger');
      }
    });
  }
  async editCenter(row: Center): Promise<void> {
    const modal = await this.modalController.create({
      component: EditCenterModalComponent,
      componentProps: { center: { ...row } },
      cssClass: 'edit-center-modal'
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data && data.updated && data.center) {
      // Update the row in the table
      const idx = this.centers.findIndex(c => c.id === data.center.id);
      if (idx > -1) {
        this.centers[idx] = data.center;
        this.rowData = [...this.centers];
        if (this.gridApi) {
          this.gridApi.setGridOption('rowData', this.rowData);
        }
        await this.showToast('Center updated successfully', 'success');

        // Fallback: reload from API so table matches server-calculated values
        // (and ensures we keep branch mapping in sync).
        try {
          const existingColumnState = this.gridApi?.getColumnState() ?? this.lastColumnState;
          await this.loadCenters(true);
          if (this.gridApi && Array.isArray(existingColumnState)) {
            this.gridApi.applyColumnState({
              state: existingColumnState as any,
              defaultState: { sort: null }
            });
          }
          this.syncPaginatorFromGrid();
        } catch {
          // Ignore reload errors; the optimistic UI update already shows new values.
        }
      }
    }
  }

  async deleteCenter(row: Center): Promise<void> {
    const confirmed = await this.showConfirmDialog(`Are you sure you want to delete center "${row.centerName}"?`);
    if (!confirmed) return;
    this.isLoading = true;
    try {
      await new Promise((resolve, reject) => {
        this.centerService.deleteCenter(row.id!).subscribe({
          next: () => resolve(true),
          error: (err: unknown) => reject(err)
        });
      });
      this.centers = this.centers.filter(c => c.id !== row.id);
      this.rowData = [...this.centers];
      if (this.gridApi) {
        this.gridApi.setGridOption('rowData', this.rowData);
        this.gridApi.paginationGoToPage(Math.min(this.paginatorPageIndex, Math.max(this.gridApi.paginationGetTotalPages() - 1, 0)));
      }
      this.syncPaginatorFromGrid();
      await this.showToast('Center deleted successfully', 'success');
    } catch (err) {
      await this.showToast('Failed to delete center', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  private async showConfirmDialog(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const alert = document.createElement('ion-alert');
      alert.header = 'Confirm Delete';
      alert.message = message;
      alert.buttons = [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => resolve(false)
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => resolve(true)
        }
      ];
      document.body.appendChild(alert);
      void alert.present();
    });
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      color,
      position: 'top'
    });
    await toast.present();
  }
}

