import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import {
  ViewWillEnter,
  ModalController,
  ToastController,
  LoadingController
} from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { BranchService } from '../../services/branch.service';
import { Branch } from '../../models/branch.models';
import { CenterService } from '../../services/center.service';
import { Center } from '../../models/center.models';
import { UserContextService } from '../../services/user-context.service';
import { AddCenterModalComponent } from './add-center-modal.component';
import { EditCenterModalComponent } from './edit-center-modal.component';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';


@Component({
  selector: 'app-centers',
  templateUrl: './centers.page.html',
  styleUrls: ['./centers.page.scss']
})
export class CentersPage implements OnInit, ViewWillEnter, AfterViewInit {
  activeMenu: string = 'Centers';
  centers: Center[] = [];
  isLoading = false;

  selectedBranchId: number | null = null;
  selectedBranchName: string = '';

  displayedColumns: string[] = ['centerName', 'centerAddress', 'city', 'branchName', 'actions'];
  filterColumns: string[] = ['centerName', 'centerAddress', 'city', 'branchName'];
  dataSource = new MatTableDataSource<Center>([]);

  filters: { [key: string]: string } = {
    centerName: '',
    centerAddress: '',
    city: '',
    branchName: ''
  };

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private authService: AuthService,
    private router: Router,
    private centerService: CenterService,
    private branchService: BranchService,
    private userContext: UserContextService,
    private modalController: ModalController,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) { }

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
    // Per-column filter predicate
    this.dataSource.filterPredicate = (data: Center, filter: string) => {
      const filters = JSON.parse(filter || '{}');
      return Object.keys(this.filters).every(key => {
        if (!filters[key]) return true;
        return ((data as Record<string, any>)[key] ?? '').toString().toLowerCase().includes(filters[key].toLowerCase());
      });
    };
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

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


  onFilterChange(event: any): void {
    const value = event?.target?.value ?? event?.detail?.value ?? '';
    // Legacy global filter (not used with per-column)
    this.dataSource.filter = value.toString().trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  applyColumnFilter(): void {
    // Triggers filterPredicate with all filters
    this.dataSource.filter = JSON.stringify(this.filters);
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  exportCentersToCSV(): void {
    const headers = this.displayedColumns;
    const rows = this.dataSource.filteredData.length ? this.dataSource.filteredData : this.dataSource.data;
    const csv = [headers.join(',')].concat(
      rows.map(row => headers.map(h => '"' + ((row as Record<string, any>)[h] ?? '').toString().replace(/"/g, '""') + '"').join(','))
    ).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'centers.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  printCentersTable(): void {
    const headers = this.displayedColumns;
    const rows = this.dataSource.filteredData.length ? this.dataSource.filteredData : this.dataSource.data;
    let html = '<table border="1" style="border-collapse:collapse;width:100%">';
    html += '<thead><tr>' + headers.map(h => `<th style="padding:4px 8px">${h}</th>`).join('') + '</tr></thead>';
    html += '<tbody>' + rows.map(row => '<tr>' + headers.map(h => `<td style="padding:4px 8px">${(row as Record<string, any>)[h] ?? ''}</td>`).join('') + '</tr>').join('') + '</tbody></table>';
    const win = window.open('', '', 'width=900,height=700');
    win!.document.write('<html><head><title>Centers Table</title></head><body>' + html + '</body></html>');
    win!.print();
    win!.close();
  }

  // Centers are auto-loaded on enter; keep filter fields intact between navigations.

  async openAddCenterModal(): Promise<void> {
    const modal = await this.modalController.create({
      component: AddCenterModalComponent,
      cssClass: 'add-center-modal',
      breakpoints: [0, 0.5, 1],
      initialBreakpoint: 1
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data && data.created) {
      await this.loadCenters();
      await this.showToast('Center created successfully', 'success');
    }
  }

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

  onBranchChange(branch: Branch): void {
    console.log('Branch changed to:', branch);
  }

  private async loadCenters(): Promise<void> {
    if (this.isLoading) return;

    this.isLoading = true;
    const loading = await this.loadingController.create({ message: 'Loading centers...' });
    await loading.present();

    const selectedBranchId = this.getSelectedBranchId();
    this.selectedBranchId = selectedBranchId;
    this.selectedBranchName = '';

    // Fetch both centers and branches in parallel
    this.centerService.getAllCenters().subscribe({
      next: async centers => {
        this.branchService.getBranches().subscribe({
          next: async branches => {
            const branchMap = new Map(branches.map(b => [Number(b.id), b.name]));
            const selectedBranchName = selectedBranchId != null ? (branchMap.get(Number(selectedBranchId)) || '') : '';
            this.selectedBranchName = selectedBranchName;

            const mapped = (centers ?? []).map(center => {
              const branchId = Number((center as any).branchId ?? (center as any).BranchId ?? center.branchId ?? 0) || undefined;
              const branchName = branchMap.get(Number(branchId ?? 0)) || center.branchName || '';
              return {
                ...center,
                branchId,
                branchName
              };
            });

            // If a branch is selected (e.g. user clicked Navigate), show only that branch's centers
            this.centers = selectedBranchId != null
              ? mapped.filter(c => Number(c.branchId) === Number(selectedBranchId) || (!!selectedBranchName && c.branchName === selectedBranchName))
              : mapped;

            this.dataSource.data = this.centers;
            this.dataSource.paginator = this.paginator;
            this.isLoading = false;
            await loading.dismiss();
          },
          error: async () => {
            // If branches fail to load, still filter by branchId if present
            const mapped = (centers ?? []).map(center => {
              const branchId = Number((center as any).branchId ?? (center as any).BranchId ?? center.branchId ?? 0) || undefined;
              return { ...center, branchId };
            });
            this.centers = selectedBranchId != null
              ? mapped.filter(c => Number((c as any).branchId) === Number(selectedBranchId))
              : mapped;
            this.dataSource.data = this.centers;
            this.isLoading = false;
            await loading.dismiss();
            await this.showToast('Failed to load branches.', 'danger');
          }
        });
      },
      error: async () => {
        this.centers = [];
        this.dataSource.data = [];
        this.isLoading = false;
        await loading.dismiss();
        await this.showToast('Failed to load centers.', 'danger');
      }
    });
  }
  async editCenter(row: Center): Promise<void> {
    const modal = await this.modalController.create({
      component: EditCenterModalComponent,
      componentProps: { center: { ...row } },
      cssClass: 'edit-center-modal',
      breakpoints: [0, 0.5, 1],
      initialBreakpoint: 1
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data && data.updated && data.center) {
      // Update the row in the table
      const idx = this.centers.findIndex(c => c.id === data.center.id);
      if (idx > -1) {
        this.centers[idx] = data.center;
        this.dataSource.data = [...this.centers];
        await this.showToast('Center updated successfully', 'success');

        // Fallback: reload from API so table matches server-calculated values
        // (and ensures we keep branch mapping in sync).
        try {
          const existingFilters = { ...this.filters };
          await this.loadCenters();
          this.filters = existingFilters;
          this.applyColumnFilter();
        } catch {
          // Ignore reload errors; the optimistic UI update already shows new values.
        }
      }
    }
  }

  async deleteCenter(row: Center): Promise<void> {
    const confirmed = await this.showConfirmDialog(`Are you sure you want to delete center "${row.centerName}"? This action cannot be undone.`);
    if (!confirmed) return;
    this.isLoading = true;
    try {
      await new Promise((resolve, reject) => {
        this.centerService.deleteCenter(row.id!).subscribe({
          next: () => resolve(true),
          error: (err: any) => reject(err)
        });
      });
      this.centers = this.centers.filter(c => c.id !== row.id);
      this.dataSource.data = [...this.centers];
      await this.showToast('Center deleted successfully', 'success');
    } catch (err) {
      await this.showToast('Failed to delete center', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  private async showConfirmDialog(message: string): Promise<boolean> {
    return new Promise(async (resolve) => {
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
      await alert.present();
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

