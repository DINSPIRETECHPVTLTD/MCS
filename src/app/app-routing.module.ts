import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'home',
    loadChildren: () => import('./pages/home/home.module').then(m => m.HomePageModule)
  },
  {
    path: 'users',
    loadChildren: () => import('./pages/users/users.module').then(m => m.UsersPageModule)
  },
  {
    path: 'organization-info',
    loadChildren: () => import('./pages/organization-info/organization-info.module').then(m => m.OrganizationInfoPageModule)
  },
  {
    path: 'approvals',
    loadChildren: () => import('./pages/approvals/approvals.module').then(m => m.ApprovalsPageModule)
  },
  {
    path: 'add-branch',
    loadChildren: () => import('./pages/add-branch/add-branch.module').then(m => m.AddBranchPageModule)
  },
  {
    path: 'branch-dashboard',
    loadChildren: () => import('./pages/branch-dashboard/branch-dashboard.module').then(m => m.BranchDashboardPageModule)
  },
  {
    path: 'centers',
    loadChildren: () => import('./pages/centers/centers.module').then(m => m.CentersPageModule)
  },
  {
    path: 'pocs',
    loadChildren: () => import('./pages/pocs/pocs.module').then(m => m.PocsPageModule)
  },
  {
    path: 'staff',
    loadChildren: () => import('./pages/staff/staff.module').then(m => m.StaffPageModule)
  },
  {
    path: 'members',
    loadChildren: () => import('./pages/members/members.module').then(m => m.MembersPageModule)
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}

