import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { BranchService, Branch } from '../../services/branch.service';

@Component({
  selector: 'app-centers',
  templateUrl: './centers.page.html',
  styleUrls: ['./centers.page.scss']
})
export class CentersPage implements OnInit {
  activeMenu: string = 'Centers';
  centers: any[] = [];

  constructor(
    private authService: AuthService,
    private router: Router
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

  onBranchChange(branch: Branch): void {
    console.log('Branch changed to:', branch);
  }
}

