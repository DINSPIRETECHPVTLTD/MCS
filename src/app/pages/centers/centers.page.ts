import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ModalController, ToastController, ViewWillEnter } from '@ionic/angular';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { AuthService } from '../../services/auth.service';
import { Branch } from '../../models/branch.models';
import { CenterService } from '../../services/center.service';
import { Center } from '../../models/center.models';
import { AddCenterModalComponent } from './add-center-modal.component';

@Component({
  selector: 'app-centers',
  templateUrl: './centers.page.html',
  styleUrls: ['./centers.page.scss']
})
export class CentersPage implements OnInit, ViewWillEnter, AfterViewInit {
  activeMenu: string = 'Centers';
  centers: Center[] = [];
  isLoading = false;

  isViewCentersClicked = false;
  showSearch = false;

  displayedColumns: string[] = ['centerName', 'centerAddress', 'city', 'branchName'];
  dataSource = new MatTableDataSource<Center>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private authService: AuthService,
    private router: Router,
    private centerService: CenterService,
    private modalController: ModalController,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) { }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.dataSource.filterPredicate = (data: Center, filter: string) => {
      const normalized = filter.trim().toLowerCase();
      if (!normalized) return true;

      return [data.centerName, data.centerAddress, data.city, data.branchName]
        .map(v => (v ?? '').toString().toLowerCase())
        .some(v => v.includes(normalized));
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
    // Do not auto-load: user will click "View Centers"
  }

  onFilterChange(event: any): void {
    const value = event?.target?.value ?? event?.detail?.value ?? '';
    this.dataSource.filter = value.toString().trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  async onViewCenters(): Promise<void> {
    this.isViewCentersClicked = true;
    this.showSearch = true;
    await this.loadCenters();
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

    this.centerService.getAllCenters().subscribe({
      next: async centers => {
        this.centers = centers ?? [];
        this.dataSource.data = this.centers;
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
      await this.loadCenters();
    }
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

