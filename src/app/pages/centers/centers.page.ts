import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ModalController, ToastController, ViewWillEnter } from '@ionic/angular';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { AuthService } from '../../services/auth.service';
import { Branch } from '../../models/branch.models';
import { CenterService } from '../../services/center.service';
import { BranchService } from '../../services/branch.service';
import { Center } from '../../models/center.models';
import { AddCenterModalComponent } from './add-center-modal.component';
import { EditCenterModalComponent } from './edit-center-modal.component';

@Component({
  selector: 'app-centers',
  templateUrl: './centers.page.html',
  styleUrls: ['./centers.page.scss']
})

export class CentersPage implements OnInit, ViewWillEnter, AfterViewInit {
  activeMenu: string = 'Centers';
  centers: Center[] = [];
  branches: Branch[] = [];
  selectedBranchId: number | null = null;
  isLoading = false;

  isViewCentersClicked = false;
  showSearch = false;

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
    private modalController: ModalController,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) { }


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
    // Load branches for dropdown
    this.branchService.getBranches().subscribe({
      next: branches => {
        this.branches = branches;
        // Set default selected branch if available
        if (branches && branches.length > 0) {
          this.selectedBranchId = branches[0].id;
        }
      },
      error: () => {
        this.branches = [];
      }
    });
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
    // Do not auto-load: user will click "View Centers"
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

  async onViewCenters(): Promise<void> {
    this.isViewCentersClicked = true;
    this.showSearch = true;
    // Reset all filters
    Object.keys(this.filters).forEach(key => this.filters[key] = '');
    this.dataSource.filter = '';
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
    await this.loadCenters();
  }

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

  onBranchChange(branch: Branch | number): void {
    // Accept either Branch object or branchId
    let branchId: number | null = null;
    if (typeof branch === 'number') {
      branchId = branch;
    } else if (branch && typeof branch.id === 'number') {
      branchId = branch.id;
    }
    this.selectedBranchId = branchId;
    this.applyBranchFilter();
  }

  applyBranchFilter(): void {
    if (this.selectedBranchId) {
      this.dataSource.data = this.centers.filter(center => Number(center.branchId) === this.selectedBranchId);
    } else {
      this.dataSource.data = this.centers;
    }
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  private async loadCenters(): Promise<void> {
    if (this.isLoading) return;

    this.isLoading = true;
    const loading = await this.loadingController.create({ message: 'Loading centers...' });
    await loading.present();

    // Fetch centers only, branches are loaded in ngOnInit
    this.centerService.getAllCenters().subscribe({
      next: async centers => {
        // Map branch names if branches are loaded
        const branchMap = new Map((this.branches ?? []).map(b => [Number(b.id), b.name]));
        this.centers = (centers ?? []).map(center => ({
          ...center,
          branchName: branchMap.get(Number((center as any).branchId ?? (center as any).BranchId ?? 0)) || center.branchName || ''
        }));
        // Always apply branch filter using selectedBranchId
        this.applyBranchFilter();
        setTimeout(() => {
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
        }, 0);
        this.isLoading = false;
        await loading.dismiss();
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

  async openAddCenterModal(): Promise<void> {
    const modal = await this.modalController.create({
      component: AddCenterModalComponent,
      cssClass: 'add-center-modal',
      breakpoints: [0, 0.5, 1],
      initialBreakpoint: 1
    });

    await modal.present();
    const { data } = await modal.onWillDismiss();

    if (data && data.success) {
      await this.showToast('Center added successfully', 'success');
      this.isViewCentersClicked = true;
      this.showSearch = true;
      // Reset all filters
      Object.keys(this.filters).forEach(key => this.filters[key] = '');
      this.dataSource.filter = '';
      await this.loadCenters();
    }
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

