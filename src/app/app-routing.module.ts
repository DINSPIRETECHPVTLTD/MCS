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
    path: 'branches',
    loadChildren: () => import('./pages/branches/branches.module').then(m => m.BranchesPageModule)
  },
  {
    path: 'master-data',
    loadChildren: () => import('./pages/master-data/master-data.module').then(m => m.MasterDataPageModule)
  },
  {
    path: 'branch-dashboard',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'branch-dashboard/:branchId',
    loadChildren: () => import('./pages/branch-dashboard/branch-dashboard.module').then(m => m.BranchDashboardPageModule)
  },
  {
    path: 'centers',
    loadChildren: () => import('./pages/centers/centers.module').then(m => m.CentersPageModule)
  },
  {
    path: 'payment-terms',
    loadChildren: () => import('./pages/paymentterms/paymentterms.module').then(m => m.PaymentTermsPageModule)
  },
  {
    path: 'payments',
    redirectTo: 'payment-terms',
    pathMatch: 'full'
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
  },
  {
    path: 'add-loan',
    loadChildren: () => import('./pages/add-loan/add-loan.module').then(m => m.AddLoanPageModule)
  },
  {
    path: 'manage-loan',
    loadChildren: () => import('./pages/manage-loan/manage-loan.module').then(m => m.ManageLoanPageModule)
  },
  {
    path: 'preclose-loan',
    loadChildren: () => import('./pages/preclose-loan/preclose-loan.module').then(m => m.PrecloseLoanPageModule)
  },
  {
    path: 'recovery-posting',
    loadChildren: () => import('./pages/recovery-posting/recovery-posting.module').then(m => m.RecoveryPostingPageModule)
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { 
      preloadingStrategy: PreloadAllModules,
      enableTracing: false,
      useHash: false,
      scrollPositionRestoration: 'enabled'
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}

