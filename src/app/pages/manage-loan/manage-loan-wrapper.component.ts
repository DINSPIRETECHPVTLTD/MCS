import { Component } from '@angular/core';

/**
 * Wrapper for Manage Loan feature so that child routes (list vs repayment summary)
 * render in this outlet. Fixes ion-router-outlet not updating when navigating
 * between sibling components under the same lazy-loaded module.
 */
@Component({
  selector: 'app-manage-loan-wrapper',
  template: '<router-outlet></router-outlet>'
})
export class ManageLoanWrapperComponent {}
