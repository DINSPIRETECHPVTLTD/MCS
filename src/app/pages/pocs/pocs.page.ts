import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { BranchService, Branch } from '../../services/branch.service';

@Component({
  selector: 'app-pocs',
  templateUrl: './pocs.page.html',
  styleUrls: ['./pocs.page.scss']
})
export class PocsPage implements OnInit {
  activeMenu: string = 'POCs';
  pocs: any[] = [];

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

